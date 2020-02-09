


var stringForToioJs = '\n' + 
    '/* Sound data converted from MIDI file */\n' + 
    '\n' + 'const melody = [\n';
			stringForToioJs += '];' + '\n\n\n\n\n\n\n\n';
			document.getElementById("output").innerHTML = stringForToioJs;
document.getElementById("output").innerHTML = stringForToioJs;
document.getElementById("output").setAttribute("class", "prettyprint lang-js linenums");
PR.prettyPrint();

// execute dropify.
$('.dropify').dropify();





// Global Constants
const gCubes = [ undefined, undefined ];

// Cube Connection
const SERVICE_UUID              = '10b20100-5b3b-4571-9508-cf3efcd7bbae';
const LIGHT_CHARCTERISTICS_UUID = '10b20103-5b3b-4571-9508-cf3efcd7bbae';
const SOUND_CHARCTERISTICS_UUID = '10b20104-5b3b-4571-9508-cf3efcd7bbae';

const connectNewCube = () => {

    const cube = { 
        device:undefined, 
        sever:undefined, 
        service:undefined, 
        soundChar:undefined, 
        lightChar:undefined 
    };

    // Scan only toio Core Cubes
    const options = {
        filters: [
            { services: [ SERVICE_UUID ] },
        ],
    }

    navigator.bluetooth.requestDevice( options ).then( device => {
        cube.device = device;
        if( cube === gCubes[0] ){
            turnOnLightCian( cube );
            changeConnectCubeButtonStatus( 2, undefined, true );
        }
        changeConnectCubeButtonStatus( undefined, cube, false );
        return device.gatt.connect();
    }).then( server => {
        cube.server = server;
        return server.getPrimaryService( SERVICE_UUID );
    }).then(service => {
        cube.service = service;
        return cube.service.getCharacteristic( SOUND_CHARCTERISTICS_UUID );
    }).then( characteristic => {
        cube.motorChar = characteristic;
        return cube.service.getCharacteristic( LIGHT_CHARCTERISTICS_UUID );
    }).then( characteristic => {
        cube.lightChar = characteristic;
        if( cube === gCubes[0] ){
            turnOnLightCian( cube );
        }else{
            turnOnLightGreen( cube );
        }
    });

    return cube;
}

const changeConnectCubeButtonStatus = ( id, cube, enabled ) => {

    if( id ){
        document.getElementById( "btConnectCube" + id ).disabled = !enabled;
    }else{
        if( gCubes[0] === cube ){
            document.getElementById( "btConnectCube1" ).disabled = !enabled;
        }else{
            document.getElementById( "btConnectCube2" ).disabled = !enabled;
        }
    }
    
}


// Cube Commands
// -- Light Commands
const turnOffLight = ( cube ) => {

    const CMD_TURN_OFF = 0x01;
    const buf = new Uint8Array([ CMD_TURN_OFF ]);
    if( ( cube !== undefined ) && ( cube.lightChar !== undefined ) ){
        cube.lightChar.writeValue( buf );
    }

}

const turnOnLightGreen = ( cube ) => {

    // Green light
    const buf = new Uint8Array([ 0x03, 0x00, 0x01, 0x01, 0x00, 0xFF, 0x00 ]);
    if( ( cube !== undefined ) && ( cube.lightChar !== undefined ) ){
        cube.lightChar.writeValue( buf );
    }

}

const turnOnLightCian = ( cube ) => {

    // Cian light
    const buf = new Uint8Array([ 0x03, 0x00, 0x01, 0x01, 0x00, 0xFF, 0xFF ]);
    if( ( cube !== undefined ) && ( cube.lightChar !== undefined ) ){
        cube.lightChar.writeValue( buf );
    }

}

// Initialize 
const initialize = () => {
    
    // Event Listning for GUI buttons.
    for( let item of [ 1, 2 ] ){
        document.getElementById( "btConnectCube" + item ).addEventListener( "click", async ev => {

            if( item === 1 ){
                gCubes[0] = connectNewCube();
            }else{
                gCubes[1] = connectNewCube();
            }
            
        });
    }

    document.getElementById( "btShowOperation" ).addEventListener( "click", async ev => {
        window.open('https://github.com/tetunori/toioCoreCubeGampadControl/blob/master/README.md','_blank');
    });

    changeConnectCubeButtonStatus( 2, undefined, false );
    updateStatus();

}

initialize();


// Main loop
const MAIN_LOOP_INTERVAL_MSEC = 50;
let gPreviousExecuteTime = undefined;

const updateStatus = () => {

    const currentTime = ( new Date() ).getTime();
    if( gPreviousExecuteTime === undefined ){
        gPreviousExecuteTime = currentTime;
    }

    // Avoid issuing ble command too fast
    if( ( currentTime - gPreviousExecuteTime ) > MAIN_LOOP_INTERVAL_MSEC ){
        executeCubeCommand();
        gPreviousExecuteTime = currentTime;
    }

    window.requestAnimationFrame( updateStatus );

}

const executeCubeCommand = () => {
    for( let index of [ 0, 1 ] ){
        // op..
    }
}

