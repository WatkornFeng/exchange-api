const express = require("express");
const cors = require("cors");
const mysql = require("mysql");

const bcrypt = require("bcrypt");
const saltRounds = 10;
const dotenv = require("dotenv");
dotenv.config();
var jwt = require("jsonwebtoken");
const secret = process.env.SECRET_TOKEN;
const app = express();

app.use(cors());
app.use(express.json());

const db = mysql.createConnection(process.env.DATABASE_URL);

app.post("/register", (req, res) => {
  const emailReg = req.body.email;
  const passReg = req.body.pass;

  const sqlSearch = "SELECT email FROM users WHERE email = ?  ";
  const sqlInsert = "INSERT INTO users (email,pass) VALUES(?,?)";
  // bcrypt the password
  bcrypt.hash(passReg, saltRounds, (err, hash) => {
    db.query(sqlSearch, emailReg, (err, result) => {
      if (result.length > 0) {
        res.send({ message: "This Email was used already!", status: "bad" });
      } else {
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
  const password = req.body.password;
  const sqlSearch = "SELECT * FROM users WHERE email = ?  ";
  db.query(sqlSearch, [username], (err, result) => {
    if (result.length > 0) {
      bcrypt.compare(password, result[0].pass, (err, response) => {
        if (response === true) {
          var mail = result[0].email;
          var token = jwt.sign({ email: result[0].email }, secret, {
            expiresIn: "1h",
          });

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
    var decoded = jwt.verify(token, secret);
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
    if (result.length > 0) {
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
      db.query(sqlUpdate, [email, currencyId], (err, result) => {
        if (err) {
          res.send({ status: "bad", message: "update not success" });
        } else {
          res.send({ status: "ok", message: "update success" });
        }
      });
    } else {
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
    if (result.length > 0) {
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
    }
  });
});

app.post("/delete", (req, res) => {
  const email = req.body.email;
  const currencyId = req.body.idDelete;

  const sqlDeleteFav =
    "DELETE FROM portfolio WHERE email = ? and currency_id = ? ";
  const sqlDeleteTrans = "DELETE FROM transaction WHERE currency_id = ? ";
  db.query(sqlDeleteFav, [email, currencyId], (err, result) => {
    if (err) {
      // console.log(err);
    } else {
      // console.log(result);
    }
  });
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

app.get("/test", function (req, res) {
  res.send("Hello from the 'test' URL");
});

app.listen(3001, () => {
  console.log("running on port 3001");
});
