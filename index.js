
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

const MAX_CUBE_SOUND_NUM = 59;

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
        cube.soundChar = characteristic;
        return cube.service.getCharacteristic( LIGHT_CHARCTERISTICS_UUID );
    }).then( characteristic => {
        cube.lightChar = characteristic;
        if( cube === gCubes[0] ){
            turnOnLightCian( cube );
            enablePlaySampleButton();
        }else{
            turnOnLightGreen( cube );
        }
    });

    return cube;
}

const changeButtonStatus = ( btID, enabled ) => {
    document.getElementById( btID ).disabled = !enabled;
}

const changeConnectCubeButtonStatus = ( idButton, cube, enabled ) => {

    if( idButton ){
        changeButtonStatus( "btConnectCube" + idButton, enabled );
    }else{
        if( gCubes[0] === cube ){
            changeButtonStatus( "btConnectCube1", enabled );
        }else{
            changeButtonStatus( "btConnectCube2", enabled );
        }
    }
    
}

const disablePlaySampleButton = () => { changeButtonStatus( "btPlaySample", false ); }
const enablePlaySampleButton = () => { changeButtonStatus( "btPlaySample", true ); }
const disableStopSampleButton = () => { changeButtonStatus( "btStopSample", false ); }
const enableStopSampleButton = () => { changeButtonStatus( "btStopSample", true ); }

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

// -- Sound Commands
const playSE = ( cube, idSE ) => {

    // Play pre-install sound effect
    const buf = new Uint8Array([ 0x02, idSE, 0xFF ]);
    if( ( cube !== undefined ) && ( cube.soundChar !== undefined ) ){
        cube.soundChar.writeValue( buf );
    }

}

const playSingleNote = ( cube, note, duration ) => {

    // Specify single note sound
    const buf = new Uint8Array([ 0x01, 0x01, duration, note, 0xFF ]);
    playMelody( cube, buf );

}

const playMelody = ( cube, melody ) => {

    // Play MIDI note numbers
    // Add 1 byte prefix( 0x03 = MIDI note numbers ) to melody
    const buf = new Uint8Array( melody.length + 1 );
    buf[0] = 0x03;
    buf.set( melody, 1 );
    if( ( cube !== undefined ) && ( cube.soundChar !== undefined ) ){
        cube.soundChar.writeValue( buf );
    }

}

const stopSound = () => {

    // Stop sound
    const buf = new Uint8Array([ 0x01 ]);
    const cube = gCubes[0];
    if( ( cube !== undefined ) && ( cube.soundChar !== undefined ) ){
        let promise = cube.soundChar.writeValue( buf ).catch(error => {
            // re-try
            setTimeout( stopSound(), 100 );
        })
    }

}

// Sample Melody
let isPlayingSampleMelody = false;
let gPlaySampleMolodyTimerID = undefined;

const playSampleMelody = () => {

    isPlayingSampleMelody = true;
    playSampleMelodyUp();

}

const playSampleMelodyUp = () => { playSampleMelodyCore( true ); }
const playSampleMelodyDown = () => { playSampleMelodyCore( false ); }

const playSampleMelodyCore = ( isUp ) => {
    
    const REPEAT_COUNT = 0x01;
    const NUM_OPERATION = MAX_CUBE_SOUND_NUM;
    const DURATION = 0x05;
    const LONG_DURATION = 0x64;
    const BASE_NOTE = 0x1F;
    const MAX_VOLUME = 0xFF;

    const melody = new Uint8Array( 2 + 3 * NUM_OPERATION );
    melody[0] = REPEAT_COUNT;
    melody[1] = NUM_OPERATION;
    for( let id = 0; id < NUM_OPERATION; id++ ){
        melody[ 3 * id + 2 ] = DURATION;
        if( isUp ){
            melody[ 3 * id + 3 ] = BASE_NOTE + id;
        }else{
            melody[ 3 * id + 3 ] = BASE_NOTE + NUM_OPERATION - id;
        }
        melody[ 3 * id + 4 ] = MAX_VOLUME;
    }
    melody[ 3 * NUM_OPERATION - 1 ] = LONG_DURATION;
    playMelody( gCubes[0], melody );

    gPlaySampleMolodyTimerID = setTimeout( 
        isUp ? playSampleMelodyDown : playSampleMelodyUp, 
            DURATION * NUM_OPERATION * 10 );

}

const stopSampleMelody = () => {

    // Clear TimerID
    if( gPlaySampleMolodyTimerID !== undefined ){
        clearTimeout( gPlaySampleMolodyTimerID );
        gPlaySampleMolodyTimerID = undefined;
    }

    if( gCubes[0] ){ stopSound( gCubes[0] ); }
    if( gCubes[1] ){ stopSound( gCubes[1] ); }

    if( isPlayingSampleMelody ){
        isPlayingSampleMelody = false;
        disableStopSampleButton();
        enablePlaySampleButton();
    }

}


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
    //for( let index of [ 0, 1 ] ){
    //}
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

    document.getElementById( "btPlaySample" ).addEventListener( "click", async ev => {
        disablePlaySampleButton();
        enableStopSampleButton();
        playSampleMelody();
    });

    document.getElementById( "btStopSample" ).addEventListener( "click", async ev => {
        stopSampleMelody();
    });

    document.getElementById( "btPlaySound" ).addEventListener( "click", async ev => {
    });

    document.getElementById( "btStopSound" ).addEventListener( "click", async ev => {
    });

    document.getElementById( "btShowOperation" ).addEventListener( "click", async ev => {
        window.open('https://github.com/tetunori/toioCoreCubeGampadControl/blob/master/README.md','_blank');
    });

    updateStatus();

}

initialize();


