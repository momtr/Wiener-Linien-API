// server.js

const express = require("express");
const request = require("request");
const app = express();

// for the csv file
const csv = require("csv-parser");
const fs = require("fs");
const csv_data = [];

app.use(express.static("public"));

app.get("/", function(request, response) {
  response.sendFile(__dirname + "/views/index.html");
});

app.get("/getData", function(req, res) {
  request("http://www.wienerlinien.at/ogd_realtime/monitor?rbl=4926", function(
    error,
    response,
    body
  ) {
    if (!error && response.statusCode == 200) {
      res.send(
        JSON.stringify({
          data: body,
          code: 1,
          message: "GET_DATA"
        })
      );
    } else {
      console.log(error);
    }
  });
});

app.get("/getLines", function(req, res) {
  let line = req.param("line");
  fs.createReadStream("linien.csv")
    .pipe(csv())
    .on("data", csv_res => {
      csv_data.push(csv_res);
    })
    .on("end", () => {
      // transform the data
      let transform = [];
      for (let i of csv_data) {
        // categrories = haltestellen_id:0, typ:1, diva:2, name:3, gemeinde:4, gemeinde_id:5, WG_lat:6, WG_long:7, stand:8
        transform.push(
          i[
            'LINIEN_ID";"BEZEICHNUNG";"REIHENFOLGE";"ECHTZEIT";"VERKEHRSMITTEL";"STAND'
          ].split(";")
        );
      }
      for (let row = 0; row < transform.length; row++) {
        for (let col = 0; col < transform[row].length; col++) {
          transform[row][col] = transform[row][col].replace('"', "");
        }
        if (line) {
          if (transform[row][1].indexOf(line) < 0) {
            transform.splice(row, 1);
            --row;
          }
        }
        if (row === transform.length - 1) {
          res.send(
            JSON.stringify({
              data: transform,
              code: 2,
              message: "GET_DATA_LINES_FROM_CSV_SOURCE::DATA.WIEN.GV"
            })
          );
        }
      }
    });
});

// returns steige array (if line_id is given it returns all steige belongin to this particular line)
async function getSteige(line_id) {
  let steige = [];
  fs.createReadStream("linien.csv")
    .pipe(csv())
    .on("data", csv_res => {
      //console.log(csv_res['LINIEN_ID";"BEZEICHNUNG";"REIHENFOLGE";"ECHTZEIT";"VERKEHRSMITTEL";"STAND']);
      steige.push(
        csv_res[
          'LINIEN_ID";"BEZEICHNUNG";"REIHENFOLGE";"ECHTZEIT";"VERKEHRSMITTEL";"STAND'
        ]
      );
    })
    .on("end", () => {
      return steige;
    });
}

app.get("/getSteige", async function(req, res) {
  let steige = await getSteige().then(v => {
    console.log(v);
  });
  res.send(
    JSON.stringify({
      data: steige,
      code: 3,
      message: "GET_DATA_STEIGE_FROM_CSV_SOURCE::DATA.WIEN.GV"
    })
  );
});

// listen on port 3000
const listener = app.listen(process.env.PORT, function() {
  console.log("Your app is listening on port " + listener.address().port);
});
