make: submodule homehue

submodule:
	cd bootstrap && npm install
	cd bootstrap && bower install
	cd bootstrap && grunt dist
	cp bootstrap/dist/js/bootstrap.min.js dist/bootstrap/bootstrap.min.js
	cp bootstrap/dist/css/bootstrap.min.css dist/bootstrap/bootstrap.min.css
	cp -R bootstrap/dist/fonts/* dist/fonts/

homehue:
	npm install
	grunt
	node dist/node.min.js

