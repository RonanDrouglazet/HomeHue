make: git submodule cleanSubmodule homehue

git:
	cd bootstrap && git pull --rebase
	cd bootstrap-slider && git pull --rebase

submodule:
	cd bootstrap && npm install
	cd bootstrap && bower install
	cd bootstrap && grunt dist
	cd bootstrap-slider && npm install
	cd bootstrap-slider && grunt test
	cp bootstrap-slider/dist/bootstrap-slider.min.js dist/bootstrap/bootstrap-slider.min.js
	cp bootstrap-slider/dist/css/bootstrap-slider.min.css dist/bootstrap/bootstrap-slider.min.css
	cp bootstrap/dist/js/bootstrap.min.js dist/bootstrap/bootstrap.min.js
	cp bootstrap/dist/css/bootstrap.min.css dist/bootstrap/bootstrap.min.css
	cp -R bootstrap/dist/fonts/* dist/fonts/

cleanSubmodule:
	cd bootstrap && git checkout .
	cd bootstrap-slider && git checkout .

homehue:
	npm install
	grunt
	#    _    _                      _    _
	#   | |  | |                    | |  | |
	#   | |__| | ___  _ __ ___   ___| |__| |_   _  ___
	#   |  __  |/ _ \| '_ ` _ \ / _ \  __  | | | |/ _ \ JS
	#   | |  | | (_) | | | | | |  __/ |  | | |_| |  __/
	#   |_|  |_|\___/|_| |_| |_|\___|_|  |_|\__,_|\___|
	#
	#   running on http://localhost:8080
	node dist/node.min.js

