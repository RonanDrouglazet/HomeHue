make: bowermodule homehue

install:
	#If you have not node / npm, please download it at http://nodejs.org/ before calling make install
	sudo npm i -g bower
	sudo npm i -g grunt-cli
	bower install bootstrap
	bower install seiyria-bootstrap-slider

bowermodule:
	#If you have not bower, call "make install" before all
	bower update
	npm install

homehue:
	#If you have not grunt, call "make install" before all
	grunt
	#    _    _                      _    _
	#   | |  | |                    | |  | |
	#   | |__| | ___  _ __ ___   ___| |__| |_   _  ___
	#   |  __  |/ _ \| '_ ` _ \ / _ \  __  | | | |/ _ \ JS
	#   | |  | | (_) | | | | | |  __/ |  | | |_| |  __/
	#   |_|  |_|\___/|_| |_| |_|\___|_|  |_|\__,_|\___|
	#
	#   running on http://localhost:8080
	node dist/app_back.min.js
