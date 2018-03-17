/* eslint-disable no-console, no-use-before-define */
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const Loki = require('lokijs');

const DB_NAME = 'db.json';
const COLLECTION_NAME = 'images';
const UPLOAD_PATH = 'upload';

const upload = multer({
  dest: `${UPLOAD_PATH}/`,
  fileFilter: imageFilter,
  limits: {fileSize: 512000}
});
const db = new Loki(`${UPLOAD_PATH}/${DB_NAME}`, {
  autoload: true,
  autosave: true,
  autosaveInterval: 4000,
  autoloadCallback: databaseInitialize
});

const app = express();
app.use(cors());

let server;

function databaseInitialize() {
  const col = db.getCollection(COLLECTION_NAME);
  if (col === null) {
    db.addCollection(COLLECTION_NAME);
  }

  app.post('/upload/images', upload.array('images', 12), async (req, res) => {
    try {
      let data = [].concat(col.insert(req.files));
      res.status(200).send(data.map(x => ({id: x.$loki, fileName: x.filename, originalName: x.originalname})));
    } catch (err) {
      res.sendStatus(400);
    }
  });

  // app.get('/images', async (req, res) => {
  //     try {
  //         res.send(col.data);
  //     } catch (err) {
  //         res.sendStatus(400);
  //     }
  // })

  app.get('/images/:id', async (req, res) => {
    try {
      const result = col.get(req.params.id);
      if (!result) {
        res.sendStatus(404);
        return;
      }
      res.setHeader('Content-Type', result.mimetype);
      fs.createReadStream(path.join(UPLOAD_PATH, result.filename)).pipe(res);
    } catch (err) {
      res.sendStatus(400);
    }
  });

  server = app.listen(3000, function () {
    console.log('listening on port 3000');
  });
}

function imageFilter(req, file, cb) {
  // accept image only
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
    return cb(new Error('Only image files are allowed!'), false);
  }
  return cb(null, true);
}

process.on('SIGINT', function () {
  console.log('flushing database');
  db.close();
  server.close(() => console.log('bye'));
});

/* eslint-enable no-console, no-use-before-define */
