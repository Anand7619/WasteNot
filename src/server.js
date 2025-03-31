const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');
const collection = require('./config');
const Donation = require('./mongodb');
const flash = require("connect-flash");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));
app.use('/images', express.static(path.join(__dirname, '../assets')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

app.use(
    session({
        secret: 'RandomString',
        resave: true,
        saveUninitialized: true
    })
);

app.use(flash());

// Middleware to make flash messages available in EJS
app.use((req, res, next) => {
    res.locals.message = req.flash("message");
    next();
});

// Route for login page
app.get('/', (req, res) => {
    res.render('login');
});

// Route for signup page
app.get("/signup", (req, res) => {
    res.render("signup");  
});

// Route for login page
app.get("/login", (req, res) => {
    res.render("login");  
});

// Route to view donations
app.get('/see-donations', async (req, res) => {
    try {
        // Fetch all donations from the database
        const allDonations = await Donation.find({});
        
        res.render('see-donations', { donations: allDonations });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching donations: ' + error.message });
    }
});

// Login route
app.post('/login', async (req, res) => {
    try {
        const user = await collection.findOne({ username: req.body.username });

        if (!user) {
            req.flash("message", "Invalid email or password.");
            return res.redirect('/login');
        }

        const isMatch = await bcrypt.compare(req.body.password, user.password);
        
        if (isMatch) {
            req.session.user = user;
            return res.redirect('/home');
        } else {
            req.flash("message", "Invalid email or password.");
            return res.redirect('/login');
        }
    } catch (error) {
        req.session.message = '⚠️ Something went wrong. Try again!';
        return res.redirect('/login');
    }
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error(err);
        }
        res.redirect('/');
    });
});

// Home route
app.get('/home', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/');
    }

    res.render('home');
});

// Donation submission route
app.post('/home', async (req, res) => {
    const data = {
        name: req.body.name,
        mobileNumber: req.body.mobno,
        donationType: req.body.donation,
        address: req.body.adress,
        message: req.body.text
    };

    try {
        // Save donation data to database
        const userData = await Donation.insertMany(data);
        console.log(userData);
        req.flash("message", "Successfully submitted. Thank you for your donation!");
        res.redirect('/home');
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error submitting donation: ' + error.message });
    }
});

// Signup route
app.post('/signup', async (req, res) => {
    try {
        const existingUser = await collection.findOne({ username: req.body.username });
        if (existingUser) {
            req.flash("message", "Username Already exists !");
            return res.redirect('/signup');
        }

        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const newUser = new collection({
            name: req.body.name,
            username: req.body.username,
            password: hashedPassword
        });

        await newUser.save();
        req.flash("message", "registered successfully! Please login.");
        res.redirect('/login');
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error registering user: ' + error.message });
    }
});

// Start the server
const port = 5000;
app.listen(port, () => {
    console.log('Server running on port:', port);
});