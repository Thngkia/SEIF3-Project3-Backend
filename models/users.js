const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        max: 100
    },
    email: {
        type: String,
        required: true,
        max: 100,
        unique: true
    },
    pwsalt: {
        type: String,
        required: true
    },
    hash: {
        type: String,
        required: true
    },
    // address
    location: {
        required: true,
        type: String
    },
    // phone number
    number: {
        required: true,
        type: String
    },
    created_at: {
        type: Date,
        required: true,
        default: Date.now
    },
    updated_at: {
        type: Date,
        required: true,
        default: Date.now
    },
    searchLocation: {
        type: Array,
        required: false,
        default: []
    },
    emailNotification: {
        type: Boolean,
        required: false
    },
    latLng: {
        type: String,
        required: true
    }
})

const UserModel = mongoose.model('User', userSchema)

module.exports = UserModel
