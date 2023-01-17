const express = require('express');
const ejs = require("ejs")

const axios = require('axios');

const fileUpload = require('express-fileupload');



const app = express();


app.set('view engine', 'ejs');
app.set('views', 'views');

app.use(fileUpload());

app.use(express.static('public'))

app.get("/", (req, res) => {
    res.render(`index`)
})

app.post('/extract', async (req, res) => {
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send('No files were uploaded.');
    }

    const file = req.files.file;

    try {
        const tikaResponse = await axios.put('http://localhost:9998/tika', file.data, {
            headers: {
                'Content-Type': file.mimetype,
                'Accept': 'text/plain'
            }
        });

        res.json({
            text: tikaResponse.data
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error extracting text from file.');
    }
});

app.listen(3004, () => {
    console.log('API listening on port 3004.');
});
