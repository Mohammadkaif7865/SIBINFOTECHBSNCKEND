var jwt = require('jsonwebtoken');
var cookie = require('../middlewares/cookie');
const secretKey = 'yaushd8oais8923748023984uijksdhy3ur8934urfj384u';

const api_token = 'FgRCHG4OVv8Z1BcrjExKJcqspvTsUTCe';

var generateToken = (payload) => {
	return jwt.sign({
		data: payload
	}, secretKey);
};

var validateToken = (req, res, next) => {

	if(req.headers.authorization == undefined) {
		res.json({error: true, message: 'Please provide token'});
	} else if(req.headers.authorization != api_token) {
		res.json({error: true, message: 'Invalid token'});
	} else {
		next();
	}

};

var validateLogin = (req, res, next) => {
	const token = cookie.getCookie('admin', req);
	if (token) {
		var tokenDecoded = jwt.verify(token, secretKey);
		req.admin = tokenDecoded.data;
		next();
	} else {
		res.redirect('/api/login');
	}
};

var alreadyLogged = (req, res, next) => {
	const token = cookie.getCookie('admin', req);
	if (token) {
		res.redirect('/api/dashboard');
	} else {
		next();
	}
};

module.exports = { generateToken, validateToken, validateLogin, alreadyLogged };
