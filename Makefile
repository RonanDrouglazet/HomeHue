make: submodule homehue

submodule:
	cd bootstrap && npm install
	cd bootstrap && bower install
	cd bootstrap && grunt dist

homehue:
	npm install
	grunt

