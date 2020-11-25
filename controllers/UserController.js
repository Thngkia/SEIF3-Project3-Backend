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
                // if found in DB, means email has already been take, redirect to registration page
                if (result) {
                    res.redirect('/users/register')
                    return
                }

                // no document found in DB, can proceed with registration

                // generate uuid as salt
                const salt = uuid.v4()

                // hash combination using bcrypt
                const combination = salt + req.body.password

                // hash the combination using SHA256
                const hash = SHA256(combination).toString()

                // create user in DB
                UserModel.create({
                    name: req.body.name,
                    email: req.body.email,
                    pwsalt: salt,
                    hash: hash,
                    location: req.body.location,
                    number: req.body.number
                })
                    .then(createResult => {
                        res.redirect('/')
                    })
                    .catch(err => {
                        res.redirect('/users/register')
                    })
            })
            .catch(err => {
                console.log(err)
                res.redirect('/users/register')
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
                    first_name: result.first_name,
                    last_name: result.last_name,
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
                    expiresAt: rawJWT.exp
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

    getUserProfile: (req, res) => {
        res.json({
            data: "dummy"
        })
    }

}

module.exports = controllers
