module Main where

type Vector = [Double]

-- Split a CSV row by commas
splitComma :: String -> [String]
splitComma [] = [""]
splitComma (c:cs)
    | c == ','  = "" : rest
    | otherwise = (c : head rest) : tail rest
  where
    rest = splitComma cs

-- Convert CSV row into vector
parseRow :: String -> Vector
parseRow row =
    map read (splitComma row)

-- Euclidean distance
distance :: Vector -> Vector -> Double
distance xs ys =
    sqrt $ sum $ zipWith (\x y -> (x - y)^2) xs ys

-- Cluster structure
data Cluster = Cluster
    { centroid :: Vector
    , count :: Int
    } deriving Show

-- Update centroid
updateCentroid :: Cluster -> Vector -> Cluster
updateCentroid (Cluster c n) x =
    let n' = n + 1
        newCentroid =
            zipWith (\ci xi -> ci + (xi - ci) / fromIntegral n') c x
    in Cluster newCentroid n'

-- Find nearest cluster
nearestCluster :: Vector -> [Cluster] -> Cluster
nearestCluster x (c:cs) =
    foldl (\best current ->
        if distance x (centroid current) < distance x (centroid best)
        then current
        else best) c cs

-- Update clusters
updateClusters :: Vector -> [Cluster] -> [Cluster]
updateClusters x clusters =
    map update clusters
  where
    nearest = nearestCluster x clusters
    update c
        | centroid c == centroid nearest = updateCentroid c x
        | otherwise = c

-- Minimum distance
minDistance :: Vector -> [Cluster] -> Double
minDistance x clusters =
    minimum (map (\c -> distance x (centroid c)) clusters)

-- Drift detection
driftDetected :: Double -> Double -> Bool
driftDetected threshold dist =
    dist > threshold

-- Log distances to CSV
logDistance :: Int -> Double -> IO ()
logDistance n dist =
    appendFile "distance_log.csv" (show n ++ "," ++ show dist ++ "\n")

-- Process EEG stream
processStream :: Int -> Int -> [Vector] -> [Cluster] -> IO ()
processStream _ _ [] _ = return ()
processStream n alertCount (x:xs) clusters = do
    let dist = minDistance x clusters

    -- Save data for graph
    logDistance n dist

    let threshold = 300
    let maxAlerts = 20

    -- Show limited alerts
    if driftDetected threshold dist && alertCount < maxAlerts
        then putStrLn ("[ALERT] Signal " ++ show n ++ " | Distance: " ++ show (round dist))
        else return ()

    let newAlertCount =
            if driftDetected threshold dist then alertCount + 1 else alertCount

    let newClusters = updateClusters x clusters

    -- Print progress every 1000 signals
    if n `mod` 1000 == 0
        then putStrLn ("[INFO] Processed " ++ show n ++ " EEG signals")
        else return ()

    processStream (n+1) newAlertCount xs newClusters

-- Main
main :: IO ()
main = do
    content <- readFile "eeg_clean.csv"
    let rows = tail (lines content)       -- remove header
    let vectors = map parseRow rows

    -- Create fresh CSV file for logging
    writeFile "distance_log.csv" "Signal,Distance\n"

    -- Initialize clusters
    let initialClusters =
            [ Cluster (vectors !! 0) 1
            , Cluster (vectors !! 1) 1
            ]

    putStrLn "Starting EEG clustering and drift detection...\n"
    processStream 1 0 (drop 2 vectors) initialClusters