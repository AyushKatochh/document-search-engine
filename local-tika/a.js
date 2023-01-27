const express = require('express');
const pdf = require('pdf-poppler');
const elasticUrl = "http://localhost:9200";
const { Client } = require("elasticsearch");
const path = require("path");
const elasticsearch = require('elasticsearch');
const fs = require("fs");
const multer = require("multer");
const axios = require("axios");
const mime = require("mime-types");
const directoryPath = path.join(__dirname, 'database');
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




const convertPdf = async () => {
    try {
         

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
    } catch (err) {
        console.log('Unable to scan directory: ' + err);
    }
}

convertPdf();
