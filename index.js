
let stringForToioJs = '\n' + 
    '/* Sound data converted from MIDI file */\n' + 
    '\n' + 'const melody = [\n';
			stringForToioJs += '];' + '\n\n';
			document.getElementById("output").innerHTML = stringForToioJs;
document.getElementById("output").innerHTML = stringForToioJs;
document.getElementById("output").setAttribute("class", "prettyprint lang-js linenums");
PR.prettyPrint();




// File Selector
let melodyBuf = undefined;
let melodyTracksOriginal = undefined;
const fileSelector = document.getElementById( 'fileSelector' );
// Set onChange event to file selector.
fileSelector.onchange = () => {

	const fileReader = new FileReader();
	fileReader.onload = () => {

    disablePlayMIDIButton();
    const parsedMidiData = parseMIDIData( fileReader.result );
    console.log( parsedMidiData );

    updateTrackSelector( parsedMidiData );
    
    if( isSupportedMidiData( parsedMidiData ) ){
      melodyTracksOriginal = convertMIDIToCubeSound( parsedMidiData );
      // console.log( melodyTracksOriginal );
      enableMIDIButton();
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

const updateTrackSelector = ( midi ) => {

  for( let cubeId of [ 1, 2 ] ){

    // Initialize selector
    const select = document.getElementById( 'MIDITrackCube' + cubeId );

    if ( select.hasChildNodes() ) {
      while( select.childNodes.length > 0 ) {
        select.removeChild( select.firstChild );
      }
    }

    // Append selector items
    for( let trackId = 0; trackId < midi.tracks.length; trackId++ ){
      
      const option = document.createElement( 'option' );
      option.value = '' + ( trackId + 1 );
      option.text = 'Track ' + ( trackId + 1 );
      select.appendChild( option );

    }

  }
  
  // Set appropriate item 
  let count = 1;
  for( let trackId = 0; trackId < midi.tracks.length; trackId++ ){
    
    if( 1 ){

      const select = document.getElementById( 'MIDITrackCube' + count );
      select.selectedIndex = trackId;
      count++;
      if( count > 2 ){
        break;
      }

    }

  }
  
}

const convertMIDIToCubeSound = ( midi ) => {

  const trackArray = new Array( midi.tracks.length );
  const NOTE_OFF_NUMBER = 128;

  midi.tracks.forEach( ( track, trackId ) => {

    const melodyArray = [];
    const notes = track.notes
    notes.forEach( ( note, index ) => {
      let restTime = 0; 
      if( index > 0 ){
        if( note.time === notes[ index - 1 ].time ){
          // Skip for multiple attack
          return; // continue forEach.
        }

        restTime = note.time - ( notes[ index - 1 ].duration + notes[ index - 1 ].time );

      }

      if( restTime > 0.01 ){
        inputNoteData( restTime, NOTE_OFF_NUMBER, note.velocity, melodyArray );
        inputNoteData( note.duration, note.midi, note.velocity, melodyArray );
      }else{
        inputNoteData( note.duration, note.midi, note.velocity, melodyArray );
      }
    });
    trackArray[ trackId ] = melodyArray;

  });

  console.log( trackArray );
  return trackArray;

}

const getTrackId = ( cubeId ) => {

  const select = document.getElementById( 'MIDITrackCube' + cubeId );
  return select.selectedIndex;

}

const getDurationOfMelody = ( melody ) => {

  let retVal = 0;

  const numOps = melody.length / 3;
  for( let index = 0; index < numOps; index++ ){
    retVal += melody[ index * 3 ] * 10;
  }

  // console.log( retVal );
  return retVal;

}


const enableMIDIButton = () => {
  if( gCubes[0] && gCubes[0].soundChar && melodyTracksOriginal ){
    enablePlayMIDIButton();    
  }
}




// Input converted Note data to the target array.
// duration : [Input]  Duration(sec) of the note
// note 		: [Input]  Note data
// velocity : [Input]  Velocity of note in the MIDI data.
// 										 we need handle Velocity:0 as note off. Others are as 'on' 
// target 	: [Output] A note is pushed into this array.
const inputNoteData = ( duration, note, velocity, target ) => {
  
  const MAX_NOTE_DURATION = 2.50;
  let leftDuration = duration;

  // console.log( duration );

  while( MAX_NOTE_DURATION < leftDuration ){    
    
    inputSingleNoteData( MAX_NOTE_DURATION, note, velocity, target );
    leftDuration -= MAX_NOTE_DURATION;

  }

  inputSingleNoteData( leftDuration, note, velocity, target );

}

const inputSingleNoteData = ( duration, note, velocity, target ) => {
  
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

const MAX_SOUND_OPERATION_NUM = 59;

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
            enablePlayPreInSEButton();
            enableMIDIButton();
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
const disablePlayPreInSEButton = () => { changeButtonStatus( "btPlayPreInSE", false ); }
const enablePlayPreInSEButton = () => { changeButtonStatus( "btPlayPreInSE", true ); }
const disablePlayMIDIButton = () => { changeButtonStatus( "btPlayMIDI", false ); }
const enablePlayMIDIButton = () => { changeButtonStatus( "btPlayMIDI", true ); }
const disableStopMIDIButton = () => { changeButtonStatus( "btStopMIDI", false ); }
const enableStopMIDIButton = () => { changeButtonStatus( "btStopMIDI", true ); }


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

// Pre-installed SE
const playPreInSE = () => {
  const idSE = document.getElementById( 'preInSE' ).value;
  playSE( gCubes[0], idSE );
}

// MIDI Melody
let isPlayingMIDIMelody = false;
let gPlayMIDIMolodyTimerID = undefined;

const playMIDIMelody = () => {

  isPlayingMIDIMelody = true;
  disablePlayMIDIButton();
  enableStopMIDIButton();
  disablePlaySampleButton();
  disablePlayNoteButton();
  disablePlayPreInSEButton();

  melodyBuf = new Uint8Array( melodyTracksOriginal[ getTrackId( 1 ) ] );

  playMIDIMelodyCore();

}

const playMIDIMelodyCore = () => {

  if( isPlayingMIDIMelody === false ){
    return;
  }

  let duration;
  if( melodyBuf.length > MAX_SOUND_OPERATION_NUM * 3 ){

    const buf = new Uint8Array( MAX_SOUND_OPERATION_NUM * 3 + 2 );

    buf[0] = 0x01;
    buf[1] = MAX_SOUND_OPERATION_NUM;
    buf.set( melodyBuf.slice( 0, MAX_SOUND_OPERATION_NUM * 3 ), 2 );
    console.log( "a: " + buf );
    playMelody( gCubes[0], buf );
    duration = getDurationOfMelody( melodyBuf.slice( 0, MAX_SOUND_OPERATION_NUM * 3 ) );
    melodyBuf = melodyBuf.slice( MAX_SOUND_OPERATION_NUM * 3, melodyBuf.length );

  }else{

    const buf = new Uint8Array( melodyBuf.length + 2 );

    buf[0] = 0x01;
    buf[1] = melodyBuf.length / 3;
    buf.set( melodyBuf, 2 );
    playMelody( gCubes[0], buf );
    duration = getDurationOfMelody( melodyBuf );
    melodyBuf = undefined;
  }
  gPlayMIDIMolodyTimerID = setTimeout( onNextMIDIMelody, duration );

}

const onNextMIDIMelody = () => {
  if( melodyBuf === undefined ){
    endPlayMIDIMelody();
  }else{
    playMIDIMelodyCore();
  }
}

const endPlayMIDIMelody = () => {
  if( isPlayingMIDIMelody ){
      isPlayingMIDIMelody = false;
      disableStopMIDIButton();
      enablePlayMIDIButton();
      enablePlaySampleButton();
      enablePlayNoteButton();
      enablePlayPreInSEButton();
  }
}

const stopMIDIMelody = () => {

    // Clear TimerID
    if( gPlayMIDIMolodyTimerID !== undefined ){
        clearTimeout( gPlayMIDIMolodyTimerID );
        gPlayMIDIMolodyTimerID = undefined;
    }

    if( gCubes[0] ){ stopSound( gCubes[0] ); }
    if( gCubes[1] ){ stopSound( gCubes[1] ); }

    if( isPlayingMIDIMelody ){
        isPlayingMIDIMelody = false;
        disableStopMIDIButton();
        enablePlayMIDIButton();
        enablePlayNoteButton();
        enablePlayPreInSEButton();
        enablePlaySampleButton();
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
    const NUM_OPERATION = MAX_SOUND_OPERATION_NUM;
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
        enablePlayPreInSEButton();
        enablePlayMIDIButton();
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
    
    document.getElementById( 'preInSE' ).addEventListener( "change", async ev => {
        playPreInSE();
    });
    document.getElementById( "btPlayPreInSE" ).addEventListener( "click", async ev => {
        playPreInSE();
    });

    document.getElementById( "btPlaySample" ).addEventListener( "click", async ev => {
        disablePlaySampleButton();
        disablePlayNoteButton();
        disablePlayPreInSEButton();
        disablePlayMIDIButton();
        enableStopSampleButton();
        playSampleMelody();
    });

    document.getElementById( "btStopSample" ).addEventListener( "click", async ev => {
        stopSampleMelody();
    });

    document.getElementById( "btPlayMIDI" ).addEventListener( "click", async ev => {
      playMIDIMelody();
    });

    document.getElementById( "btStopMIDI" ).addEventListener( "click", async ev => {
      stopMIDIMelody();
    });

    document.getElementById( "btShowReadme" ).addEventListener( "click", async ev => {
        window.open('https://github.com/tetunori/toioCoreCubeSoundChecker/blob/master/README.md','_blank');
    });

    updateStatus();

}

initialize();

