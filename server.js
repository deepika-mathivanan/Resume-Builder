require("dotenv").config({ path: __dirname + "/.env" });
const express = require("express");
const bodyParser = require("body-parser");
const pdf = require("html-pdf");
const cors = require("cors");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const path = require("path");
const { ApolloServer, gql } = require('apollo-server-express');

const pdfTemplate = require("./documents"); 

const app = express();
const URI = process.env.MONGO_URI;


mongoose
  .connect(URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB via Mongoose!"))
  .catch((error) => console.error("MongoDB connection failed:", error));

const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  picture: String,
  token: String,
});

const resumeSchema = new mongoose.Schema({
  userid: String,

});

const User = mongoose.model("User", userSchema);
const Resume = mongoose.model("Resume", resumeSchema);


const typeDefs = gql`
  type Theme {
    themename: String
    img: String
    colors: String
    id: ID
  }

  type Query {
    themes: [Theme]
  }
`;


const themesData = [
  {
    themename: "Light",
    img: "light-theme.png",
    colors: "white,gray",
    id: "1",
  },
  {
    themename: "Dark",
    img: "dark-theme.png",
    colors: "black,gray",
    id: "2",
  },
];


const resolvers = {
  Query: {
    themes: () => themesData,
  },
};


const server = new ApolloServer({ typeDefs, resolvers });

async function startServer() {
  await server.start(); 
  server.applyMiddleware({ app, path: '/v1/graphql' }); 
}

startServer();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "/public")));


app.post("/signup", async (req, res) => {
  const { firstName, lastName, email, picture } = req.body;
  try {
    const token = jwt.sign({ email }, "SECRET_KEY", { expiresIn: "1d" });
    const user = new User({ firstName, lastName, email, picture, token });
    const result = await user.save();
    res.status(201).json({
      message: "Signup successful",
      user: result,
    });
  } catch (error) {
    res.status(500).json({ message: "Signup failed", error });
  }
});


app.post("/login", async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not registered. Please sign up." });
    }

    const resume = await Resume.findOne({ userid: user._id.toString() });
    res.status(200).json({ message: "Login successful", user, resume });
  } catch (error) {
    res.status(500).json({ message: "Login failed", error });
  }
});


app.post("/save", async (req, res) => {
  const { user, resume } = req.body;
  delete resume.step;

  try {
    const userDoc = await User.findOne({ email: user.email });
    const USERID = userDoc._id.toString();
    const data = { userid: USERID, ...resume };

    await Resume.findOneAndUpdate({ userid: USERID }, data, { upsert: true });
    res.sendStatus(200);
  } catch (error) {
    res.status(500).json({ message: "Failed to save resume", error });
  }
});


app.post("/get-resume", async (req, res) => {
  const { email } = req.body;

  try {
    const userDoc = await User.findOne({ email });
    const resumeDoc = await Resume.findOne({ userid: userDoc._id.toString() });

    if (resumeDoc) {
      res.json(resumeDoc.toObject());
    } else {
      res.status(404).json({ message: "No resume found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Error retrieving resume", error });
  }
});


app.post("/create-pdf", (req, res) => {
  pdf.create(pdfTemplate(req.body), { 
    height: "42cm", 
    width: "35.7cm", 
    timeout: "6000", 
    childProcessOptions: { 
      env: { OPENSSL_CONF: "/dev/null" } 
    } 
  }).toFile("Resume.pdf", (err) => {
    if (err) return res.status(500).send("Failed to create PDF");
    res.status(201).send("PDF created successfully");
  });
});

app.get("/fetch-pdf", (req, res) => {
  const file = `${__dirname}/Resume.pdf`;
  res.download(file);
});


app.get("/", (req, res) => {
  res.send("Hello from 'Resume Builder' Web App");
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
