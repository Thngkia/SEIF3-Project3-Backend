const axios = require('axios')

const haversine = require("haversine-distance");

const controllers = {
    getclusters: (req, res) => {
        axios({
            method: 'get',
            url: 'https://www.nea.gov.sg/api/OneMap/GetMapData/DENGUE_CLUSTER',
        })
            .then(result => {
                // clean up api by converting to a Json obj and then into an array from api
                let clustersApi = (JSON.parse(result.data)).SrchResults.slice(1)
                let riskAreas = {
                    High: returnLatLangArray(clustersApi, "high"),
                    Medium: returnLatLangArray(clustersApi, "medium")
                }
                let riskArea = getRiskArea(riskAreas, req.body.LatLng)

                res.send(riskArea)
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
                High: returnLatLangArray(clustersApi, "high"),
                Medium: returnLatLangArray(clustersApi, "medium")
            }
            const { riskAreaType, minimumDistance, isWithinRiskArea } = getMinimumDistanceToRiskArea(riskAreas, req.body.LatLng)
            console.log("get nearest risk area distance")
            res.send({ riskAreaType, minimumDistance, isWithinRiskArea })
        })
    },
}

function getRiskArea(riskAreas, lat) {
    console.log(riskAreas, lat)
    let riskArea = "Low"
    // Checking whether the current location (lat) belongs to either 
    // high risk area (riskAreas.High) or medium (riskAreas.Medium) risk area
    for (const [key, value] of Object.entries(riskAreas)) {
        if (value.includes(lat)) {
            riskArea = key
        }
    }
    return riskArea
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
    const highRiskAttribute = calculateRiskAttributes(highRiskAreaLocations, lat)
    console.log(highRiskAttribute)
    // If the current location is within 150m of high risk area then return response
    if (highRiskAttribute.isWithinRiskArea) {
        riskAreaType = "High"
        minimumDistance = highRiskAttribute.minimumDistance
        isWithinRiskArea = true
    } else { // If not then check within medium risk area
        const mediumRiskAttribute = calculateRiskAttributes(mediumRiskAreaLocations, lat)
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
 * @param {array}   locations       current location
 * @param {array}   lat             risk area location
 * 
 * @return minimum distance is in meter and is within risk area or not.
 */
function calculateRiskAttributes(locations, lat) {
    let isWithinRiskArea = false
    let minimumDistance = 0
    const SAFE_DISTANCE_FROM_RISK_AREA = 150
    // console.log(locations)
    // Calculate high risk area from current location
    for (i = 0; i < locations.length; i++) {
        const distance = calculateDistance(locations[i], lat)
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
    // console.log("riskArea")
    // console.log(riskArea)
    // console.log("currentLocation")
    // console.log(currentLocation)
    fromPointLat = fromPoint.split(",")[0]
    fromPointLng = fromPoint.split(",")[1]
    toPointLat = toPoint.split(",")[0]
    toPointLng = toPoint.split(",")[1]

    //First point in your haversine calculation
    const point1 = { lat: fromPointLat, lng: fromPointLng }

    //Second point in your haversine calculation
    const point2 = { lat: toPointLat, lng: toPointLng }

    const distanceInMeter = haversine(point2, point1); //Results in meters (default)
    // var haversine_km = haversine_m / 1000; //Results in kilometers

    // console.log("distance (in meters): " + haversine_m + "m");
    // console.log("distance (in kilometers): " + haversine_km + "km");
    // console.log("Calculating distance")
    return distanceInMeter
}

// function calculateNearestDistance(dengueRiskAreas, currentArea) {
//     const dengueRiskAreas = returnLatLangArray()
// }

//divide risk areas into high and low
function returnLatLangArray(array, type) {
    let tempLatLng = array.filter(x => {
        if (type === "high") {
            if (x["CASE_SIZE"] >= 10) {
                return true
            }
        }
        if (type === "medium") {
            if (x["CASE_SIZE"] < 10) {
                return true
            }
        }
    })
    let latlngAr = []
    if (tempLatLng) {
        tempLatLng.forEach(x => {
            latlngAr = [...latlngAr, ...x["LatLng"].split("|")]
        })
    }
    return latlngAr
}

module.exports = controllers