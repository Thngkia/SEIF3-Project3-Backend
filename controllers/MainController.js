const axios = require('axios')
const haversine = require("haversine-distance");
const { plugin } = require('mongoose');
const { reset } = require('nodemon');
const ApiModel = require('../models/api')
const UserModel = require('../models/users')
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const controllers = {
    sendMail: (req, res) => {
        sendEmail()
        res.send("email sent")
    },
    storeClusters: (req, res) => {
        storeClusters()
        return
    },
    getClusters: (req, res) => {
        ApiModel.find({}).sort({ date: -1 }).limit(1)
            .then(result => {
                if (!result) {
                    res.statusCode = 401
                    res.json({
                        "success": false,
                        "message": "Did not get API"
                    })
                    return
                }
                res.send(result[0].api)
            })
    },
    getClustersFromApi: (req,res) => {
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
                    let oneSpotCoords = {
                        size: item["CASE_SIZE"],
                        color: null,
                        coordsArr: []
                    }
                    // loop through each hot spot to and split the latlng by "|"
                    item.LatLng.split("|").forEach(item => {
                        let coordsArr = item.split(",")
                        let obj = {
                            "lat": Number(coordsArr[0]),
                            "lng": Number(coordsArr[1])
                        }
                        // push into each spot
                        oneSpotCoords.coordsArr.push(obj)
                    })
                    // push into full coords
                    fullCoords.push(oneSpotCoords)
                })
    
                // set color based on size
                fullCoords.forEach(item => {
                    if (item.size > 9) {
                        item.color = "red"
                    } else {
                        item.color = "yellow"
                    }
                })
                dailyCoords = fullCoords
                console.log(dailyCoords)
                res.send(dailyCoords)
                // data needs to be stored in different format for logic processing
            })
            .catch(err => {
                res.json({
                    "success": false,
                    "msg": "did not retrieve api"
                })
            })
    },  
    findLatLng: (req, res) => {
        console.log(req)
        res.json({
            "success": true,
            "message": "LatLng found"
        })
    },
    notifyUsersInRiskArea: (req, res) => {
        console.log("notifyUsersInRiskArea called")
        UserModel.find()
            .then(async result => {
                // if (res)
                // res.json(result)
                let publicData = await ApiModel.find()
                if (result && result.length > 0) {
                    // Filter all the users who needs to be notified by email
                    let toBeNotifiedUsers = result.filter(x => x["latLng"] && x["emailNotification"]).map(x => {
                        let data = getMinimumDistanceToRiskArea(publicData[0]["api"][0], x.latLng)
                        data.email = x["email"]
                        return { ...x, ...data }
                    })
                    if (toBeNotifiedUsers && toBeNotifiedUsers.length > 0) {
                        // Filter all the users who are within the risk area
                        let peopleRisk = toBeNotifiedUsers.filter(x => x["isWithinRiskArea"])
                        console.log(JSON.stringify(peopleRisk.length))
                        if (peopleRisk.length > 0) {
                            console.log("people in risk area")
                            // let finalEmailArray = []
                            peopleRisk.forEach(x => {
                                sendEmail(x["email"], `You are within ${x["minimumDistance"]} of risk area`)
                                // finalEmailArray.push(
                                //     {
                                //         email: x["email"],
                                //         msg: `You are within ${x["minimumDistance"]} of risk area`
                                //     }
                                // )
                            })
                        }
                    }
                }
                // res.json({})
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
            const { riskAreaType, minimumDistance, isWithinRiskArea, riskAreaColor } = getMinimumDistanceToRiskArea(riskAreas, req.body.LatLng)
            console.log("get nearest risk area distance")
            res.send({ riskAreaType, minimumDistance, isWithinRiskArea, riskAreaColor })
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
    let riskAreaColor = ""
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
        riskAreaColor = "red"
    } else { // If not then check within medium risk area
        const mediumRiskAttribute = findSafeDistanceFromRiskArea(mediumRiskAreaLocations, lat)
        if (mediumRiskAttribute.isWithinRiskArea) {
            riskAreaType = "Medium"
            minimumDistance = mediumRiskAttribute.minimumDistance
            isWithinRiskArea = true
            riskAreaColor = "yellow"
        }
    }

    return { riskAreaType, minimumDistance, isWithinRiskArea, riskAreaColor }
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
    console.log(currentLocation)
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

    // console.log(toPoint.split(",")[0], "calculate distance")

    let fromPointLat = fromPoint.split(",")[0]
    let fromPointLng = fromPoint.split(",")[1]
    let toPointLat = toPoint.split(",")[0]
    let toPointLng = toPoint.split(",")[1]

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
let storeClusters = () => {
    axios({
        method: 'get',
        url: 'https://www.nea.gov.sg/api/OneMap/GetMapData/DENGUE_CLUSTER',
    })
        .then(result => {
            // clean up api by converting to a Json obj and then into an array from api
            // let clustersApi = (JSON.parse(result.data)).SrchResults.slice(1)
            // initialise full coords array
            // let fullCoords = []
            // // loop through all the clusters api
            // clustersApi.forEach(item => {
            //     // init array for each hot spot
            //     let oneSpotCoords = {
            //         size: item["CASE_SIZE"],
            //         color: null,
            //         coordsArr: []
            //     }
            //     // loop through each hot spot to and split the latlng by "|"
            //     item.LatLng.split("|").forEach(item => {
            //         let coordsArr = item.split(",")
            //         let obj = {
            //             "lat": Number(coordsArr[0]),
            //             "lng": Number(coordsArr[1])
            //         }
            //         // push into each spot
            //         oneSpotCoords.coordsArr.push(obj)
            //     })
            //     // push into full coords
            //     fullCoords.push(oneSpotCoords)
            // })

            // // set color based on size
            // fullCoords.forEach(item => {
            //     if (item.size > 9) {
            //         item.color = "red"
            //     } else {
            //         item.color = "yellow"
            //     }
            // })
            // // dailyCoords = fullCoords
            //data needs to be stored in different format for logic processing
            ApiModel.remove()
                .then(() => {
                    // return
                    const clustersApi = (JSON.parse(result.data)).SrchResults.slice(1)
                    const riskAreas = {
                        High: extractRiskAreasLocations(clustersApi, "high"),
                        Medium: extractRiskAreasLocations(clustersApi, "medium")
                    }
                    ApiModel.create({
                        api: riskAreas,
                        success: true
                    })
                    console.log("store success")
                    return
                })

        })
        .catch(err => {
            ApiModel.create({
                api: null,
                success: false
            })
            console.log("API store fail")
            return
        })
}

let sendEmail = (toAddress, mailContent) => {
    const msg = {
        to: toAddress,
        from: 'dengueheatmap@gmail.com',
        subject: "Dengue Heatmap Warning",
        text: mailContent
    }
    sgMail
        .send(msg)
        .then(() => {
            console.log('Email sent')
        })
        .catch((error) => {
            console.log(error)
        })
}

module.exports = controllers