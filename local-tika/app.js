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

app.post('/upload', upload.single('file'), (req, res) => {
  // Get file path from uploads folder
  const filePath = 'database/' + req.file.originalname;
  
  // Send the file to the Apache Tika server for text extraction
  axios({
    method: 'put',
    // url:'http://host.docker.internal:9998/tika',
    url:'http://localhost:9998/tika', 
    data: fs.createReadStream(filePath),
    headers: { 'Content-Type': 'application/octet-stream' }
  })
  .then(response => {
    // Extract text from response
  //   const text = response.data;
  //   console.log(text);
  //   res.redirect("/");
  // })
  // .catch(error => {
  //   console.log(error);
  // });
  
  client.index({
    index: 'document-data',
    type: 'text',
    body: {
      text: response.data
    }
  })
   .then((results) => {
    const docs = [];
    
      docs.push(results);
    
    console.log(docs);  
      console.log('Data indexed successfully');
        res.status(200).redirect(`http://localhost:9200/${results._index}/${results._type}/${results._id}`)

    })
    .catch(err => {
      console.error(err);
      res.status(500).send('Error indexing data');
    });
  })
  .catch(err => {
    console.error(err);
    res.status(500).send('Error extracting text data');
  });
});
const PORT= 3004
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
