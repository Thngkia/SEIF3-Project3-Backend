const mongoose = require('mongoose')

const apiSchema = new mongoose.Schema({
    created_at: {
        type: Date,
        required: true,
        default: Date.now
    },
    api: {
        type: Array,
        required: true
    },
    success: {
        type: Boolean,
        required: true
    }
})
const ApiModel = mongoose.model('API', apiSchema)

module.exports = ApiModel
