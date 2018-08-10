const blessed = require('blessed')

module.exports = (th, err) => {
	const msg = blessed.Message({
		parent: th.screen,
		top: "100%-5",
		height: 4,
		left: 0,
		width: "100%",
		border: 'line',
	})
	msg.setFront()
	return msg.error(err)
}
