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
	#    _    _                      _    _
	#   | |  | |                    | |  | |
	#   | |__| | ___  _ __ ___   ___| |__| |_   _  ___
	#   |  __  |/ _ \| '_ ` _ \ / _ \  __  | | | |/ _ \ JS
	#   | |  | | (_) | | | | | |  __/ |  | | |_| |  __/
	#   |_|  |_|\___/|_| |_| |_|\___|_|  |_|\__,_|\___|
	#
	#   running on http://localhost:8080
	node dist/node.min.js

