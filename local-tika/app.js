const express = require('express');
const axios = require('axios');
const fs = require('fs');
const { Client } = require("elasticsearch");
const elasticUrl = "http://localhost:9200";
const multer = require('multer');
const ejs = require('ejs')
const esclient   = new Client({ node: elasticUrl });
const elasticsearch = require('elasticsearch');

const app = express();

const client = new elasticsearch.Client({
  host: 'http://localhost:9200'
  // host: 'http://host.docker.internal:9200'
});

app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.set('views', 'views');
app.set('view engine', 'ejs');
// Set up Multer for file upload
app.use(express.static('public'))

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'database/');
  },
  filename: function(req, file, cb) {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage: storage });

app.get('/', (req, res) => {
  res.render('index');
})

let intervalId;
app.post('/upload', upload.single('file'), (req, res) => {
  intervalId=setInterval(async () => {
    try {
      const filePath = 'database/' + req.file.originalname;
      const response = await axios({
        method: 'put',
        url: 'http://localhost:9998/tika',
        data: fs.createReadStream(filePath),
        headers: { 'Content-Type': 'application/octet-stream' }
      });
      const results = await client.index({
        index: 'document-data',
        type: 'text',
        body: {
          text: response.data
        }
      });
      console.log('Data indexed successfully');
      console.log(results);
    } catch (error) {
      console.error(error);
    }
  }, 480000);  // 120000 milliseconds = 2 minutes
});


  clearInterval(intervalId);
const PORT= 3004
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

