const jwt = require('jsonwebtoken')
const SHA256 = require("crypto-js/sha256")
const uuid = require('uuid')
const UserModel = require('../models/users')

const controllers = {
    register: (req, res) => {
        // try the library at https://ajv.js.org/ to validate user's input
        UserModel.findOne({
            email: req.body.email
        })
            .then(result => {
                // if email exists in DB, means email has already been taken, redirect to registration page
                if (result) {
                    console.log("Email is registered")
                    res.json({
                        "success": false,
                        "message": "Registered Account",
                    })
                    return
                }

                // Email address not in DB, can proceed with registration
                // 1. generate uuid as salt
                const salt = uuid.v4()

                // 2. hash combination using bcrypt
                const combination = salt + req.body.password

                // 3. hash the combination using SHA256
                const hash = SHA256(combination).toString()

                // 4. create user in DB
                UserModel.create({
                    name: req.body.name,
                    email: req.body.email,
                    pwsalt: salt,
                    hash: hash,
                    location: req.body.address,
                    latLng: req.body.latLng,
                    number: req.body.phone,
                    emailNotification: req.body.email ? true : false
                })
                    .then(createResult => {
                        res.statusCode = 201
                        res.json({
                            "success": true,
                            "message": "Account Created"
                        })
                        return
                    })
                    .catch(err => {
                        res.statusCode = 401
                        res.json({
                            "success": false,
                            "message": "Form error. User not created"
                        })
                        return
                    })
            })
            .catch(err => {
                res.statusCode = 500
                res.json({
                    "success": false,
                    "message": "Unable to create user"
                })
                return
            })
    },

    login: (req, res) => {
        // validate input here on your own

        // gets user with the given email
        UserModel.findOne({
            email: req.body.email
        })
            .then(result => {
                // check if result is empty, if it is, no user, so login fail, return err as json response
                if (!result) {
                    res.statusCode = 401
                    res.json({
                        "success": false,
                        "message": "Either username or password is wrong"
                    })
                    return
                }

                // combine DB user salt with given password, and apply hash algo
                const hash = SHA256(result.pwsalt + req.body.password).toString()

                // check if password is correct by comparing hashes
                if (hash !== result.hash) {
                    res.statusCode = 401
                    res.json({
                        "success": false,
                        "message": "Either username or password is wrong"
                    })
                    return
                }
                // login successful, generate JWT
                const token = jwt.sign({
                    name: result.name,
                    email: result.email,
                }, process.env.JWT_SECRET, {
                    algorithm: 'HS384',
                    expiresIn: "1h"
                })

                // decode JWT to get raw values
                const rawJWT = jwt.decode(token)

                // return token as json response
                res.json({
                    success: true,
                    token: token,
                    expiresAt: rawJWT.exp,
                    userDetails: result
                })
            })
            .catch(err => {
                res.statusCode = 500
                res.json({
                    success: false,
                    message: "unable to login due to unexpected error"
                })
            })
    },

    // logout: (req, res) => {
    //     req.session.destroy()
    //     res.redirect('/users/login')
    // }

    updateUserProfile: (req, res) => {

        UserModel.findOne({
            email: req.body.currentEmail
        })
            .then(result => {
                // check if result is empty, if not found user account return with error 
                if (!result) {
                    res.statusCode = 401
                    res.json({
                        "success": false,
                        "message": "Erro in form input"
                    })
                    return
                }

                UserModel.updateOne({
                    email: req.body.currentEmail
                },
                    {
                        name: req.body.name,
                        email: req.body.email,
                        location: req.body.address,
                        number: req.body.phone
                    })
                    .then(createResult => {
                        res.statusCode = 201
                        res.json({
                            "success": true,
                            "message": "Profile Updated"
                        })
                        return
                    })
                    .catch(err => {
                        res.statusCode = 401
                        res.json({
                            "success": false,
                            "message": "Form error. Profile Not Updated"
                        })
                        return
                    })
            })
            .catch(err => {
                res.statusCode = 500
                res.json({
                    "success": false,
                    "message": "Unable to update profile"
                })
                return
            })
    },

    seedUsers: (req, res) => {
        const salt = uuid.v4()

        // hash combination using bcrypt
        const combination = salt + "123"

        // hash the combination using SHA256
        const hash = SHA256(combination).toString()

        UserModel.create({
            name: "test2",
            email: "test@test2.com",
            pwsalt: salt,
            hash: hash,
            location: "test",
            number: 12345678
        })
            .then(createResult => {
                res.send("seed success")
            })
            .catch(err => {
                res.send("seed fail")
            })
    },

    getUsersSearchLocation: (req, res) => {
        UserModel.findOne({
            email: req.body.email
        })
            .then(result => {
                res.json({
                    success: true,
                    searchLocation: result.searchLocation,
                    userDetails: result
                })
            })
    },

    AddUsersSearchLocation: (req, res) => {
        UserModel.findOne({
            email: req.body.email
        })
            .then(result => {
                let userData = JSON.parse(JSON.stringify(result))
                if (!req.body.edit && userData.searchLocation.length === 4) {
                    return res.json({ success: false, message: "You can have a maximum of 4 saved locations" })
                }
                let index = userData.searchLocation.findIndex(x => req.body.item.tempID === x.tempID)
                if (index !== -1) {
                    userData.searchLocation[index] = req.body.item
                } else {
                    userData.searchLocation.push(req.body.item)
                }
                UserModel.updateOne({
                    email: req.body.email
                }, { $set: { searchLocation: userData.searchLocation } })
                    .then(() => {
                        res.json({ success: true })
                    })
            })
    },

    DeleteSavedLocation: (req, res) => {
        UserModel.findOne({
            email: req.body.email
        })
            .then(result => {
                let userData = JSON.parse(JSON.stringify(result))
                let index = userData.searchLocation.findIndex(x => req.body.item.tempID === x.tempID)
                if (index !== -1) {
                    userData.searchLocation.splice(index, 1)
                } else {
                    return res.json({ success: false, message: "Something Went Wrong" })
                }
                UserModel.updateOne({
                    email: req.body.email
                }, { $set: { searchLocation: userData.searchLocation } })
                    .then(() => {
                        // res.json({ success: true, message: "Item Deleted Successfully" })
                        UserModel.findOne({
                            email: req.body.email
                        })
                            .then(result => {
                                res.json({
                                    success: true,
                                    searchLocation: result.searchLocation,
                                    userDetails: result
                                })
                            })
                    })
            })
    }
}

module.exports = controllers
