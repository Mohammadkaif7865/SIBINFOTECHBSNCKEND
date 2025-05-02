var setCookie = (name, value, res) => {
	res.cookie(name, value);
};

var getCookie = (name, req) => {
	return req.cookies[name];
};

var getAllCookies = () => {
	return req.cookies;
};

var deleteCookie = (name,res) => {
	if (name.length == 0) {
		res.clearCookie();
	} else {
		res.clearCookie(name);
	}
};

module.exports = { setCookie, getCookie, getAllCookies, deleteCookie };