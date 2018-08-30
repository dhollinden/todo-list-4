
exports.authController = function (req, res, next) {

    if(!req.isAuthenticated()) {
        console.log(`req.isAuthenticated = FALSE`)
    //    res.redirect('/')
    } else {
        console.log(`req.isAuthenticated = TRUE`)
    }
    return;
}

