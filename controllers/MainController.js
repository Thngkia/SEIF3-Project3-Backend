const axios = require('axios')

const controllers = {
    getclusters: (req, res) => {
        axios({
            method: 'get',
            url: 'https://www.nea.gov.sg/api/OneMap/GetMapData/DENGUE_CLUSTER',
        })
            .then(result => {
                // clean up api by converting to a Json obj and then into an array from api
                let clustersApi = (JSON.parse(result.data)).SrchResults.slice(1)
                // initialise full coords array
                let fullCoords = []
                // loop through all the clusters api
                clustersApi.forEach(item => {
                    // init array for each hot spot
                    let oneSpotCoords = []
                    // loop through each hot spot to and split the latlng by "|"
                    item.LatLng.split("|").forEach(item => {
                        let coordsArr = item.split(",")
                        let obj = {
                            "lat": Number(coordsArr[0]),
                            "lng": Number(coordsArr[1])
                        }
                        // push into each spot
                        oneSpotCoords.push(obj)
                    })
                    // push into full coords
                    fullCoords.push(oneSpotCoords)
                })
                res.send(fullCoords)
            })
    },
    findLatLng: (req, res) => {
        console.log(req)
        res.json({
            "success": true,
            "message": "LatLng found"
        })
    },
    //function which takes request and response as input parameters
    getNearestRiskAreaDistance: (req, res) => {
        axios({
            method: 'get',
            url: 'https://www.nea.gov.sg/api/OneMap/GetMapData/DENGUE_CLUSTER',
        }).then(result => {
            // clean up api by converting to a Json obj and then into an array from api
            const clustersApi = (JSON.parse(result.data)).SrchResults.slice(1)
            const riskAreas = {
                High: extractRiskAreasLocations(clustersApi, "high"),
                Medium: extractRiskAreasLocations(clustersApi, "medium")
            }
            const { riskAreaType, minimumDistance, isWithinRiskArea } = getMinimumDistanceToRiskArea(riskAreas, req.body.LatLng)
            console.log("get nearest risk area distance")
            res.send({ riskAreaType, minimumDistance, isWithinRiskArea })
        })
    }
}

/**
 * @brief Returns the minimum distance between a risk area and current location(lat)
 *
 * @param {array}   riskArea           from location
 * @param {array}   lat                current location
 */
function getMinimumDistanceToRiskArea(riskAreas, lat) {
    // console.log(riskAreas, lat)
    let isWithinRiskArea = false
    let riskAreaType = "low"
    let minimumDistance = 0
    let highRiskAreaLocations = []
    let mediumRiskAreaLocations = []
    //seperate locations into high and low
    //locations is the locations of high and medium, return two array, this is temporary
    for (const [riskArea, locations] of Object.entries(riskAreas)) {
        if (riskArea === "High") {
            highRiskAreaLocations = locations
        }
        if (riskArea === "Medium") {
            mediumRiskAreaLocations = locations
        }
    }
    // It checks whether the current location is within 150m
    const highRiskAttribute = findSafeDistanceFromRiskArea(highRiskAreaLocations, lat)
    console.log(highRiskAttribute)
    // If the current location is within 150m of high risk area then return response
    if (highRiskAttribute.isWithinRiskArea) {
        riskAreaType = "High"
        minimumDistance = highRiskAttribute.minimumDistance
        isWithinRiskArea = true
    } else { // If not then check within medium risk area
        const mediumRiskAttribute = findSafeDistanceFromRiskArea(mediumRiskAreaLocations, lat)
        if (mediumRiskAttribute.isWithinRiskArea) {
            riskAreaType = "Medium"
            minimumDistance = mediumRiskAttribute.minimumDistance
            isWithinRiskArea = true
        }
    }

    return { riskAreaType, minimumDistance, isWithinRiskArea }
}

/**
 * @brief Calculate is current location is within safe distance from any of
 *        of the risk area location.
 *
 * @param {array}   riskAreaLocations   risk area locations
 * @param {array}   currentLocation     current location
 *
 * @return minimum distance is in meter and is within risk area or not.
 */
function findSafeDistanceFromRiskArea(riskAreaLocations, currentLocation) {
    let isWithinRiskArea = false
    let minimumDistance = 0
    const SAFE_DISTANCE_FROM_RISK_AREA = 150
    // Calculate high risk area from current location
    for (i = 0; i < riskAreaLocations.length; i++) {
        const distance = calculateDistance(riskAreaLocations[i], currentLocation)
        if (distance <= SAFE_DISTANCE_FROM_RISK_AREA) {
            console.log(distance)
            isWithinRiskArea = true
            minimumDistance = distance
            break
        }
    }
    return { minimumDistance, isWithinRiskArea }
}

/**
 * @brief Returns the distance between two points in meters.
 *
 * @param {array}   riskArea           from location
 * @param {array}   currentLocation    to location
 */
function calculateDistance(fromPoint, toPoint) {

    fromPointLat = fromPoint.split(",")[0]
    fromPointLng = fromPoint.split(",")[1]
    toPointLat = toPoint.split(",")[0]
    toPointLng = toPoint.split(",")[1]

    //First point in your haversine calculation
    const point1 = { lat: fromPointLat, lng: fromPointLng }
    //Second point in your haversine calculation
    const point2 = { lat: toPointLat, lng: toPointLng }

    const distanceInMeter = haversine(point2, point1); //Results in meters (default)

    return distanceInMeter
}

//divide risk areas into high and medium
function extractRiskAreasLocations(riskAreas, riskAreaType) {
    let tempLatLng = riskAreas.filter(x => {
        if (riskAreaType === "high") {
            if (x["CASE_SIZE"] >= 10) {
                return true
            }
        }
        if (riskAreaType === "medium") {
            if (x["CASE_SIZE"] < 10) {
                return true
            }
        }
    })
    let result = []
    if (tempLatLng) {
        tempLatLng.forEach(x => {
            result = [...result, ...x["LatLng"].split("|")]
        })
    }
    return result
}

module.exports = controllers