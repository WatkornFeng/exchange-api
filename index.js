const express = require("express"); // express = javascript framework working with node.js for support web server
const cors = require("cors"); // CORS is a node.js package for providing a Connect/Express middleware
const mysql = require("mysql"); // This is a node.js driver for mysql.

const bcrypt = require("bcrypt"); // A library for hash passwords (Make users password more safely store)
const saltRounds = 10;
const dotenv = require("dotenv");
dotenv.config();
var jwt = require("jsonwebtoken"); // For generate token from json data and encrpt with base64Url Encoded (Header,payload,signature)
const secret = process.env.SECRET_TOKEN;
const app = express();
console.log("sad");
app.use(cors()); // use cors for solve problem 'block by CORS' from fetching api across origin
app.use(express.json()); // The express.json() function is a built-in middleware function in Express.
//It parses incoming requests with JSON payloads and is based on body-parse

const db = mysql.createConnection(process.env.DATABASE_URL); // connection to database at PlanetScale

app.post("/register", (req, res) => {
  const emailReg = req.body.email;
  const passReg = req.body.pass;

  const sqlSearch = "SELECT email FROM users WHERE email = ?  ";
  const sqlInsert = "INSERT INTO users (email,pass) VALUES(?,?)";

  bcrypt.hash(passReg, saltRounds, (err, hash) => {
    //  Hash users password
    db.query(sqlSearch, emailReg, (err, result) => {
      // Search email ,it has in database or not
      if (result.length > 0) {
        res.send({ message: "This Email was used already!", status: "bad" });
      } else {
        // insert email + hash password into database
        db.query(sqlInsert, [emailReg, hash], (err, result) => {
          if (err) {
            res.send({ message: "Have some errors!", status: "bad" });
          } else {
            res.send({ message: "Account was Created!", status: "ok" });
          }
        });
      }
    });
  });
});

app.post("/login", (req, res) => {
  const username = req.body.username;
  const password = req.body.password; // เพราะว่า password ที่ส่งมาจากผู้ใช้มาเป็น plain text
  const sqlSearch = "SELECT * FROM users WHERE email = ?";
  db.query(sqlSearch, [username], (err, result) => {
    // Search email ,it has in database or not
    if (result.length > 0) {
      // compare password in database with password was send from users
      bcrypt.compare(password, result[0].pass, (err, response) => {
        if (response === true) {
          // generate token with jsonwebtoken
          var mail = result[0].email;
          var token = jwt.sign({ email: result[0].email }, secret, {
            expiresIn: "1h",
          });
          // send generated token and user's email back to front end
          res.send({
            message: "email and pass correct",
            status: "ok",
            token,
            mail,
          });
        } else {
          res.send({ message: " pass is wrong", status: "bad" });
        }
      });
    } else {
      res.send({ message: "email not found", status: "bad" });
    }
  });
});

app.post("/authen", (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    var decoded = jwt.verify(token, secret); // decode token
    res.send({ status: "ok", decoded });
  } catch (err) {
    res.send({ status: "bad", message: err });
  }
});

app.post("/buy", (req, res) => {
  const email = req.body.email;
  const currencyId = req.body.currencyId;
  const currencyEng = req.body.currencyEng;
  const buyTime = req.body.buyTime;
  const buyAmount = req.body.amount;
  const buyValue = -req.body.values;
  const side = req.body.buy;

  const sqlInsertTransaction =
    "INSERT INTO transaction (email,currency_id,side,amount,sum,time) VALUES(?,?,?,?,?,?)";
  const sqlSearch =
    "SELECT * FROM portfolio WHERE email = ? and currency_id = ? ";
  const sqlUpdate = `UPDATE portfolio SET buy_amount=buy_amount+${buyAmount},buy_sum=buy_sum-${buyValue} WHERE email = ? and  currency_id = ? `;
  const sqlInsert =
    "INSERT INTO portfolio (email,currency_id,currency_name_eng,buy_amount,buy_sum) VALUES(?,?,?,?,?)";
  db.query(sqlSearch, [email, currencyId], (err, result) => {
    // Search email and currency_id , have in database or not
    if (result.length > 0) {
      // If have , insert into data into table transaction
      db.query(
        sqlInsertTransaction,
        [email, currencyId, side, buyAmount, buyValue, buyTime],
        (err, result) => {
          if (err) {
            //console.log(err);
          } else {
            //console.log(result);
          }
        }
      );
      // And update data
      db.query(sqlUpdate, [email, currencyId], (err, result) => {
        if (err) {
          res.send({ status: "bad", message: "update not success" });
        } else {
          res.send({ status: "ok", message: "update success" });
        }
      });
    } else {
      // If Not have , insert into data into table transaction
      db.query(
        sqlInsertTransaction,
        [email, currencyId, side, buyAmount, buyValue, buyTime],
        (err, result) => {
          if (err) {
            //console.log(err);
          } else {
            // console.log(result);
          }
        }
      );
      // Insert new data into table portfolio
      db.query(
        sqlInsert,
        [email, currencyId, currencyEng, buyAmount, -buyValue],
        (err, result) => {
          if (err) {
            //console.log(err);
            res.send({ status: "bad", message: "Insert not success" });
          } else {
            //console.log(result);
            res.send({ status: "ok", message: "Insert success" });
          }
        }
      );
    }
  });
});

app.post("/port", (req, res) => {
  const email = req.body.email;

  const sqlSearch = "SELECT * FROM portfolio WHERE email = ?  ";
  // Query data from table portfolio
  db.query(sqlSearch, [email], (err, result) => {
    if (err) {
      //console.log(err);
    } else {
      // console.log(result);
      res.send(result);
    }
  });
});
app.post("/transaction", (req, res) => {
  const email = req.body.email;

  const sqlSearch = "SELECT * FROM transaction WHERE email = ?  ";
  // Query data from table transaction
  db.query(sqlSearch, [email], (err, result) => {
    if (err) {
      //console.log(err);
    } else {
      // console.log(result);
      res.send(result);
    }
  });
});
app.post("/result", (req, res) => {
  const email = req.body.email;

  const sqlSearch =
    "SELECT SUM(sum) AS 'result' FROM transaction WHERE email = ?  ";
  // Query data that summation in colunm sum from table transaction
  db.query(sqlSearch, [email], (err, result) => {
    if (err) {
      //console.log(err);
    } else {
      //console.log(result);
      res.send(result);
    }
  });
});

app.post("/sell", (req, res) => {
  const email = req.body.email;
  const currencyId = req.body.currencyId;
  const sellTime = req.body.sellTime;
  const sellAmount = req.body.amount;
  const sellValue = req.body.values;
  const side = req.body.side;

  const sqlInsertTransaction =
    "INSERT INTO transaction (email,currency_id,side,amount,sum,time) VALUES(?,?,?,?,?,?)";
  const sqlSearch =
    "SELECT * FROM portfolio WHERE email = ? and currency_id = ? ";
  const sqlUpdate = `UPDATE portfolio SET buy_amount=buy_amount-${sellAmount}, buy_sum=buy_sum-${sellValue} WHERE email = ? and  currency_id = ? `;

  db.query(sqlSearch, [email, currencyId], (err, result) => {
    // search email and currency id
    if (result.length > 0) {
      // insert data into transaction
      db.query(
        sqlInsertTransaction,
        [email, currencyId, side, sellAmount, sellValue, sellTime],
        (err, result) => {
          if (err) {
            //console.log(err);
          } else {
            // console.log(result);
          }
        }
      );
      // update data in table portfoilio
      db.query(sqlUpdate, [email, currencyId], (err, result) => {
        if (err) {
          //console.log(err);
          res.send({ status: "bad", message: "update not success" });
        } else {
          // console.log(result);
          res.send({ status: "ok", message: "update success" });
        }
      });
    } else {
      //console.log(err);
    }
  });
});

app.post("/delete", (req, res) => {
  const email = req.body.email;
  const currencyId = req.body.idDelete;

  const sqlDeleteFav =
    "DELETE FROM portfolio WHERE email = ? and currency_id = ? ";
  const sqlDeleteTrans = "DELETE FROM transaction WHERE currency_id = ? ";
  // Delete data in table portfolio
  db.query(sqlDeleteFav, [email, currencyId], (err, result) => {
    if (err) {
      // console.log(err);
    } else {
      // console.log(result);
    }
  });
  // Delete data in table transaction
  db.query(sqlDeleteTrans, [currencyId], (err, result) => {
    if (err) {
      // console.log(err);
      res.send({ status: "bad", message: "Delete not success" });
    } else {
      //console.log(result);
      res.send({ status: "ok", message: "Delete success" });
    }
  });
});

app.listen(3001, () => {
  console.log("running on port 3001");
});
