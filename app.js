#!/usr/bin/env node

"use strict";

var fs = require("fs"),
    path = require("path");

var _ = require("underscore"),
    connect = require("connect");

var bookmarks = {
    "CPSC 473": {
        url: "http://j.mp/cpsc473",
        score: 2
    },
    "CSUF": {
        url: "http://www.fullerton.edu",
        score: 1
    }
};
    
var accounts = {
    "admin": "passw0rd"
};

function redirect(location, res) {
    res.writeHead(303, {
        "Location": location
    });
    res.end();
}

function error(status, message, res) {
    res.writeHead(status, message);
    res.end(message);
}

function showTemplate(filename, variables, res) {
    var template = path.join(__dirname, "templates", filename);

    fs.readFile(template, function(err, data) {
        if (err) {
            throw err;
        }

        var content = data.toString(),
            html = _.template(content, variables);

        res.writeHead(200, {
            "Content-Type": "text/html"
        });

        res.end(html);
    });
}

function frontPage(res) {
    var titles = _.keys(bookmarks),
        sorted = _.sortBy(titles, function(title) {
        return -bookmarks[title].score;
    });

    showTemplate("frontPage.html", {
        titles: sorted,
        bookmarks: bookmarks
    }, res);
}

function vote(title, direction, res) {
    if (direction === "up") {
        bookmarks[title].score++;
    } else {
        bookmarks[title].score--;
    }

    redirect("/", res);
}

function signup(username, password, res) {
    if (_.has(accounts, username)) {
        error(403, "Username is already taken", res);
        return;
    }

    accounts[username] = password;

    redirect("/", res);
}

function submit(title, link, res) {
    var titles = _.keys(bookmarks),
        links = _.map(titles, function(title) {
            return bookmarks[title].url;
        });

    if (_.contains(links, link)) {
        error(409, "Link has already been submitted", res);
        return;
    }

    bookmarks[title] = {
        url: link,
        score: 0
    };

    redirect("/", res);
}

connect()
    .use(connect.logger())
    .use(connect.query())
    .use(connect.bodyParser())
    .use(function(req, res, next) {
        if (req.method === "GET" && req.url === "/") {
            frontPage(res);
        } else if (req.method === "POST" && req.url === "/vote") {
            vote(req.body.title, req.body.direction, res);
        } else if (req.method === "POST" && req.url === "/signup") {
            signup(req.body.username, req.body.password, res);
        } else {
            return next();
        }
    })
    .use(function(req, res, next) {
        if (/^\/submit/.test(req.url)) {
            var auth = connect.basicAuth(function(username, password) {
                return accounts[username] === password;
            });

            auth(req, res, next);
        } else {
            return next();
        }
    })
    .use(connect.static(path.join(__dirname, "public")))
    .use(function(req, res, next) {
        if (req.method === "POST" && req.url === "/submit") {
            submit(req.body.title, req.body.link, res);
        } else {
            return next();
        }
    })
    .listen(8080);

