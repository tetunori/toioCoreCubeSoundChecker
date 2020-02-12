
var stringForToioJs = '\n' + 
    '/* Sound data converted from MIDI file */\n' + 
    '\n' + 'const melody = [\n';
			stringForToioJs += '];' + '\n\n';
			document.getElementById("output").innerHTML = stringForToioJs;
document.getElementById("output").innerHTML = stringForToioJs;
document.getElementById("output").setAttribute("class", "prettyprint lang-js linenums");
PR.prettyPrint();




// File Selector
const fileSelector = document.getElementById( 'fileSelector' );
// Set onChange event to file selector.
fileSelector.onchange = () => {

	const fileReader = new FileReader();
	fileReader.onload = () => {

    const parsedMidiData = parseMIDIData( fileReader.result );
    console.log( parsedMidiData );
    
    if( isSupportedMidiData( parsedMidiData ) ){
      const cubeSoundData = convertMIDIToCubeSound( parsedMidiData );
      console.log( cubeSoundData );
      const testbuf = cubeSoundData.slice(0, 50*3);
      console.log( testbuf);
      const buf = new Uint8Array( testbuf.length + 2 );
      buf[0] = 0x01;
      buf[1] = testbuf.length/3;
      buf.set( testbuf, 2 );
      playMelody( gCubes[0], buf );
    }else{
      console.log( 'Error. Unsupported file.' );
    }
    

	}
	fileReader.readAsArrayBuffer( fileSelector.files[0] );

}

// execute dropify.
$('.dropify').dropify();

const parseMIDIData = ( midi_data ) => { return new Midi( midi_data ); }

// Judge the specified MIDI file is supported format or not.
// data : [Input] target MIDI data
const isSupportedMidiData = ( data ) => {

	let retVal = true;
	
  /* Later change...
	// Time division format : FPS is not supported.
	if( data.header.getTimeDivision() === MIDIFile.Header.FRAMES_PER_SECONDS ){
		console.log( 'Error. Time Diviesion : Frames/Sec is unsupported.' );
		retVal = false;
	}
  */

	return retVal;

}

const convertMIDIToCubeSound = ( midi ) => {

  const melodyArray = [];

  midi.tracks.forEach( track => {

    const notes = track.notes
    notes.forEach( note => {
      // note.midi, note.time, note.duration, note.name
      inputNoteData( note.duration, note.midi, note.velocity, melodyArray );
    });

  });

  const retMelodyBuf = new Uint8Array( melodyArray );
  return retMelodyBuf;

}


/*
// Convert MIDI data to sound data for toio Core Cube. 
// data : [Input] target MIDI data
function convertFromMidiData( data ){

	var retMelody = [];						// Melody array for return value.
	var trackCounter = 0; 
	var absTimeTickMilliSec = 0;  // usec. Follow the illustration below.

	// Search tracks
	for( trackCounter = 0; trackCounter < data.tracks.length; trackCounter++ ){
		var trackEventsChunk = data.tracks[trackCounter].getTrackContent();
		var events = MIDIEvents.createParser( trackEventsChunk );
		var event;
		var currentNote = -1;
		var currentVelocity = -1;
		var isFoundNoteOnEvent = false;

		while( event = events.next() ) {
			// console.log( 'Track #' + trackCounter + '/event' );
			if( event.type === MIDIEvents.EVENT_MIDI ){
				switch( event.subtype ){
					case MIDIEvents.EVENT_MIDI_NOTE_OFF:
						// event.param1 is note number.
						if( currentNote === event.param1 ){
							// console.log( 'deltaTime is ' + event.delta );
							var duration = event.delta * absTimeTickMilliSec;
							if( duration === 0 ){
								console.log( '[WARNING] duration is 0. Skip <Track #' + trackCounter + ', Event #' + event.index + '>' );
							}else{
								inputNoteData( duration, currentNote, currentVelocity, retMelody );
							}
							currentNote = -1;
							currentVelocity = -1;
						}
						break;
					case MIDIEvents.EVENT_MIDI_NOTE_ON:
						// event.param1 is note number.
						// event.param2 is velocity.
						// console.log( 'event.param1 is ' + event.param1 );
						// console.log( 'event.param2 is ' + event.param2 );
						if( currentNote !== -1 ){
							// console.log( 'deltaTime is ' + event.delta );
							var duration = event.delta * absTimeTickMilliSec;
							if( duration === 0 ){
								console.log( '[WARNING] duration is 0. Skip <Track #' + trackCounter + ', Event #' + event.index + '>' );
							}else{
								inputNoteData( duration, currentNote, currentVelocity, retMelody );
							}
						}else{
							// console.log( 'deltaTime is ' + event.delta );
							var duration = event.delta * absTimeTickMilliSec;
							if( duration === 0 ){
								console.log( '[WARNING] duration is 0. Skip <Track #' + trackCounter + ', Event #' + event.index + '>' );
							}else{
								inputNoteData( duration, 0xFF, 0, retMelody );
							}
						}

						isFoundNoteOnEvent = true;
						currentNote = event.param1;
						currentVelocity = event.param2;
						break;
				}
			}else if( event.type === MIDIEvents.EVENT_META ){
				switch( event.subtype ){
					case MIDIEvents.EVENT_META_SET_TEMPO:
						// event.tempo : usec value for 1 beat.
						// 1 / data.header.getTicksPerBeat() : beat value for 1 tick.
						// So absTimeTickMilliSec is usec value for 1 tick.
						absTimeTickMilliSec = event.tempo / data.header.getTicksPerBeat() / 1000;
						console.log( 'absTimeTickMilliSec is ' + absTimeTickMilliSec );
						break;
				}
			}

			// Check length MAX.
			if( retMelody.length >= MELODY_LENGTH_MAX ){
				console.log( '[WARNING] Melody length MAX is : ' + MELODY_LENGTH_MAX +'.' );
				break;
			}

		}

		// Check whether NoteOn event found(it means we should have achieved melody.).
		if( isFoundNoteOnEvent === true ){
			// console.log( 'EVENT_MIDI_NOTE_ON found in track[' + trackCounter +'].' );
			break;
		}

	}

	// console.log( 'Melody is ' + JSON.stringify( retMelody ) );
	return retMelody;
}

*/
// Input converted Note data to the target array.
// duration : [Input]  Duration(sec) of the note
// note 		: [Input]  Note data
// velocity : [Input]  Velocity of note in the MIDI data.
// 										 we need handle Velocity:0 as note off. Others are as 'on' 
// target 	: [Output] A note is pushed into this array.
function inputNoteData( duration, note, velocity, target ){
  
  const NOTE_OFF_NUMBER = 128;

	if( velocity > 0 ){
		target.push( Math.round( duration * 100 ) );
		target.push( note );
	}else{
		// velocity === 0.
    target.push( Math.round( duration * 100 ) );
		target.push( NOTE_OFF_NUMBER );
	}
  target.push( 0xFF );

}



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
            enablePlayNoteButton();
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
const disablePlayNoteButton = () => { changeButtonStatus( "btPlayNote", false ); }
const enablePlayNoteButton = () => { changeButtonStatus( "btPlayNote", true ); }


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

// Play Note
const playNote = () => {
  const note = document.getElementById( 'noteSlider' ).value;
  playSingleNote( gCubes[0], note, 30 );
}

const updateNoteText = () => {

  const note = document.getElementById( 'noteSlider' ).value;
  let text = '' + note + '(= ';

  const keyChars = [ 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B' ];
  text += keyChars[ note % 12 ];
  text += Math.floor( note / 12 );
  text += ')';

  document.getElementById( 'noteText' ).innerText = text;

}

const minusNoteKey = () => {
  document.getElementById( 'noteSlider' ).value--;
  updateNoteText();
  playNote();
}

const plusNoteKey = () => {
  document.getElementById( 'noteSlider' ).value++;
  updateNoteText();
  playNote();
}

// Handle key events.
window.addEventListener( 'keydown', ( event ) => { procKeyDown( event.keyCode ); });

// Procedure on Key Down
const procKeyDown = ( code ) => {

  const KEYCODE_LEFT  =  37;
  const KEYCODE_RIGHT =  39;

  if( code === KEYCODE_LEFT ){
      minusNoteKey();
  }else if( code === KEYCODE_RIGHT ){
      plusNoteKey();
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
        enablePlayNoteButton();
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

    document.getElementById( 'noteSlider' ).addEventListener( "change", async ev => {
        playNote();
    });
    document.getElementById( 'noteSlider' ).addEventListener( "input", async ev => {
        updateNoteText();
    });

    document.getElementById( "btPlayNote" ).addEventListener( "click", async ev => {
        playNote();
    });

    document.getElementById( "btPlaySample" ).addEventListener( "click", async ev => {
        disablePlaySampleButton();
        disablePlayNoteButton();
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

    document.getElementById( "btShowReadme" ).addEventListener( "click", async ev => {
        window.open('https://github.com/tetunori/toioCoreCubeSoundChecker/blob/master/README.md','_blank');
    });

    updateStatus();

}

initialize();
