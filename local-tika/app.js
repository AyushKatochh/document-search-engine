const express = require('express');
const axios = require('axios');
const fs = require('fs');
const { Client } = require("elasticsearch");
const elasticUrl = "http://localhost:9200";
//const elasticUrl = "http://host.docker.internal:9200";
//const elasticUrl = "http://elasticsearch:9200";
const pdf = require('pdf-poppler');
const multer = require('multer');
const ejs = require('ejs')
const esclient   = new Client({ node: elasticUrl });
const elasticsearch = require('elasticsearch');
const path = require("path")

const mime = require('mime-types');

const PdfExtractor = require('pdf-extractor').PdfExtractor;

const directoryPath = path.join(__dirname, 'database');
const fileType = mime.lookup(directoryPath)
const directoryPathImage = path.join(__dirname, 'ayush'); 
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

app.get('/search', async (req, res) => {
  const q = req.query.q;
  if (q) {
    try {
      const results = await client.search({
        index: 'data',
        type: 'text',
        body: {
          query: {
            match: {
              text: q
            }
          }
        }
      });
      res.json(results.hits.hits);
    } catch (error) {
      console.error(error);
      res.status(500).send('Error searching for documents.');
    }
  } else {
    res.render('search', { q });
  }
});



let docs = [];
let intervalId;
let results;
app.post('/upload', upload.single('file'), (req, res) => {
  intervalId=setInterval(async () => {
     try {
         const filePath = 'database/' + req.file.originalname;
         const fileType = mime.lookup(filePath)
        if(fileType === "application/pdf") {
        const files = await fs.promises.readdir(directoryPath);
        for (const file of files) {
            if(path.extname(file) === '.pdf'){
                let opts = {
                    format: 'jpeg',
                    out_dir: path.join(__dirname, 'ayush'),
                    out_prefix: path.basename(file, path.extname(file)),
                    page: null
                }
                await pdf.convert(path.join(directoryPath, file), opts);
                console.log(`Successfully converted ${file}`);
                const images = await fs.promises.readdir(directoryPathImage);
                for (const image of images) {
                    const filePath = path.join(directoryPathImage, image);
                    const fileType = mime.lookup(filePath);
                    const response = await axios({
                        method: 'put',
                        url: 'http://localhost:9998/tika',
                        data: fs.createReadStream(filePath),
                        headers: { 'Content-Type': fileType,
                                    'Accept': 'text/plain',
                                    "X-Tika-OCRLanguage" :"eng" }
                    });
                    console.log(response.data);
                    const result = await client.index({
                        index: 'data',
                        id: image,
                        type: 'text',  // use unique identifier
                        body: {
                            text: response.data
                        },
                        refresh: "true" //immediately available for search
                    });
                    console.log(result);
                }
            }
        }
        } else {
            const response = await axios({
        method: 'put',
         url: 'http://localhost:9998/tika',
         //url: 'http://host.docker.internal:9998/tika',      
        data: fs.createReadStream(filePath),
        headers: { 'Content-Type': fileType,
                   'Accept': 'text/plain',
                    "X-Tika-OCRLanguage" :"eng" }
      });
      console.log(response);
      results = await client.index({
        index: 'data',
        type: 'text',
        id: req.file.originalname,  // use unique identifier
        body: {
          text: response.data
        },
        refresh: "true" //immediately available for search
      });
}
    
    if (docs.indexOf(results._id) === -1) {
        docs.push(results._id); //save the _id of the indexed document
        console.log('Data indexed successfully');

        console.log(docs);
        console.log(results);
      } else {
        console.log('Document already exists');
      }

    
    } catch (err) {
        console.log('Unable to scan directory: ' + err);
    } 
  }, 60000);  // 120000 milliseconds = 2 minutes
});


// clear the interval when the app is closed
app.on("close", () => {
  clearInterval(intervalId);
});
const PORT= 3004
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});





