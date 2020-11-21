const mongoose = require('mongoose')

const entrySchema = new mongoose.Schema({
    email: {
        required: true,
        type: String
    },
    postal_code: {
        required: true,
        type: String
    },
    subscribe: {
        required: true,
        type: Boolean
    },
    user_default: {
        required: false,
        type: Boolean
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
    }
})
const EntryModel = mongoose.model('Entry', entrySchema)

module.exports = EntryModel
