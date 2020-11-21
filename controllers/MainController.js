const axios = require('axios')
const express = require('express')
const app = express()
const port = 3000


app.get('/api', (req, res) => {
    axios({
        method: 'get',
        url: 'https://www.nea.gov.sg/api/OneMap/GetMapData/DENGUE_CLUSTER',
      })
        .then(result => {
            console.log(result)
        });
})
app.get('/', (req, res) => {
    res.send("works")
})
axios({
    method: 'get',
    url: 'https://www.nea.gov.sg/api/OneMap/GetMapData/DENGUE_CLUSTER',
  })
    .then(result => {
        console.log(result)
    });