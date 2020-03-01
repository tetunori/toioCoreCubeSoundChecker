// Global Constants
const MAX_SOUND_OPERATION_NUM = 59;
const MAX_SOUND_BINARY_NUM = 3 * MAX_SOUND_OPERATION_NUM;

const CUBE_ID_ARRAY = [ 0, 1, 2 ];
const SUPPORT_CUBE_NUM = CUBE_ID_ARRAY.length;

// Global Variables.
const gCubes = [ undefined, undefined, undefined ];


// File Selector
let gMelodyBufArray = new Array( SUPPORT_CUBE_NUM );
let gMelodyTracksOriginal = undefined;
const fileSelector = document.getElementById( 'fileSelector' );

// -- on load
fileSelector.addEventListener( 'change', async ev => {
  
  const fileReader = new FileReader();
	fileReader.onload = () => {

    // parse to javascript object
    const parsedMidiData = parseMIDIData( fileReader.result );
    // console.log( parsedMidiData );
    
    // Convert to Cube sound array
    gMelodyTracksOriginal = convertMIDIToCubeSound( parsedMidiData );
    // console.log( gMelodyTracksOriginal );

    // Set and update selector of tracks.
    const selectedTrackIDs = updateTrackSelector( gMelodyTracksOriginal );
    updateCodeMIDI( selectedTrackIDs, gMelodyTracksOriginal );

    // Finally enable MIDI button.
    enableMIDIButton();

	}
  
	fileReader.readAsArrayBuffer( fileSelector.files[0] );

});

// -- Execute dropify
$('.dropify').dropify();


// MIDI

// -- Parser function using tone.js/Midi
const parseMIDIData = ( midi_data ) => { return new Midi( midi_data ); }

// -- UI : Track Selector
const updateTrackSelector = ( tracks ) => {

  for( let cubeId of CUBE_ID_ARRAY ){

    // Initialize selector
    const select = document.getElementById( 'MIDITrackCube' + ( cubeId + 1 ) );

    if ( select.hasChildNodes() ) {
      while( select.childNodes.length > 0 ) {
        select.removeChild( select.firstChild );
      }
    }

    // Append selector items
    for( let trackId = 0; trackId < tracks.length; trackId++ ){
      
      const option = document.createElement( 'option' );
      option.value = '' + ( trackId + 1 );
      option.text = 'Track ' + ( trackId + 1 );
      if( tracks[ trackId ].length === 0 ){
        option.disabled = true;
      }
      select.appendChild( option );

    }
    
    // Append OFF item in the last.
    const option = document.createElement( 'option' );
    option.value = '0';
    option.text = 'OFF'; 
    select.appendChild( option );
    select.selectedIndex = select.options.length - 1;

  }
  
  // Set appropriate items for each selector.
  let count = 1;
  let retValue = [ undefined, undefined, undefined ];
  for( let trackId = 0; trackId < tracks.length; trackId++ ){
    
    if( tracks[ trackId ].length > 0 ){

      const select = document.getElementById( 'MIDITrackCube' + count );
      select.selectedIndex = trackId;
      retValue[ count - 1 ] = trackId;
      count++;
      if( count > SUPPORT_CUBE_NUM ){
        break;
      }

    }

  }

  return retValue;
  
}

// -- UI : Enable button on MIDI playing 
const enableMIDIButton = () => {
  if( gCubes[0] && gCubes[0].soundChar && gMelodyTracksOriginal ){
    enablePlayMIDIButton();    
  }
}

// -- functions : Get track's index array that is selected now. 
const getSelectedTrackIndex = () => {

  const retValue = [ undefined, undefined, undefined ];

  for( let cubeId of CUBE_ID_ARRAY ){

    const select = document.getElementById( 'MIDITrackCube' + ( cubeId + 1 ) );
    retValue[ cubeId ] = select.selectedIndex;

  }

  // console.log( retValue );
  return retValue;

}

// -- functions : Get track ID from cubeID
const getTrackId = ( cubeId ) => {

  const select = document.getElementById( 'MIDITrackCube' + cubeId );
  return select.options[ select.selectedIndex ].value;

}

// -- functions : Get whole duration for specified melody binary sequence.
const getDurationOfMelody = ( melody ) => {

  let retVal = 0;

  const numOps = melody.length / 3;
  for( let index = 0; index < numOps; index++ ){
    retVal += melody[ index * 3 ] * 10;
  }

  // console.log( retVal );
  return retVal;

}

// -- functions : convert parsed MIDI sound to cube's format. 
const convertMIDIToCubeSound = ( midi ) => {

  const trackArray = new Array( midi.tracks.length );
  const NOTE_OFF_NUMBER = 128;

  midi.tracks.forEach( ( track, trackIndex ) => {

    const melodyArray = [];
    const notes = track.notes;
    let deltaMathRound10msec = 0; // For caring about round-off error.

    notes.forEach( ( note, index ) => {

      let restTime = 0; 

      if( ( index === 0 ) && ( note.time !== 0 ) ){

        // In case that 1st note is rest.
        const duration10msec = note.time * 100;
        inputNoteData( Math.round( duration10msec ), NOTE_OFF_NUMBER, note.velocity, melodyArray );
        deltaMathRound10msec = Math.round( duration10msec ) - duration10msec;

      }else if( index > 0 ){

        if( note.time === notes[ index - 1 ].time ){
          // Skip for multiple attack at the same time.
          return; // continue forEach.
        }

        restTime = note.time - ( notes[ index - 1 ].duration + notes[ index - 1 ].time );

      }

      // 1st calurate and input rest time.
      const restTime10msec = restTime * 100 - deltaMathRound10msec;
      if( Math.round( restTime10msec ) > 0 ){
        inputNoteData( Math.round( restTime10msec ), NOTE_OFF_NUMBER, note.velocity, melodyArray );
      }
      deltaMathRound10msec = Math.round( restTime10msec ) - restTime10msec;

      // Then, input current note.
      const duration10msec = note.duration * 100 - deltaMathRound10msec;
      inputNoteData( Math.round( duration10msec ), note.midi, note.velocity, melodyArray );
      deltaMathRound10msec = Math.round( duration10msec ) - duration10msec;

    });
    trackArray[ trackIndex ] = melodyArray;

  });

  // padding.
  trackArray.forEach( track => { paddingTrack( track ); } );

  // console.log( trackArray );
  return trackArray;

}

// -- functions : Padding for large size music to avoid variation of bluetooth trasmission time
const paddingTrack = ( track ) => {

  if( track.length > MAX_SOUND_BINARY_NUM ){
    
    const numChunksInTrack = Math.floor( track.length / ( MAX_SOUND_BINARY_NUM ) );
    const chunksDataSize = numChunksInTrack * MAX_SOUND_BINARY_NUM;
    const fraction = track.length - chunksDataSize;
    const paddingDataSize = MAX_SOUND_BINARY_NUM - fraction;
    const paddingOperationSize = paddingDataSize / 3;
    // console.log( 'paddingOperationSize ' + paddingOperationSize );

    for( let i = 0; i < paddingOperationSize; i++ ){

      const DURATION = 1; // minimum value( 10msec ).
      const NOTE_OFF_NUMBER = 128;
      const VELOCITY = 255;
      inputNoteData( DURATION, NOTE_OFF_NUMBER, VELOCITY, track );

    }
    
  }

}

// -- functions : Input converted Note data to the target array.
// duration : [Input]  Duration(unit 10msec) of the note
// note 		: [Input]  Note data
// velocity : [Input]  Velocity of note in the MIDI data.
// 										 we need handle Velocity:0 as note off. Others are as 'on' 
// target 	: [Output] A note is pushed into this array.
const inputNoteData = ( duration, note, velocity, target ) => {
  
  const MAX_NOTE_DURATION = 250;
  let leftDuration = duration;
  // console.log( duration );

  if( duration === 0 ){
    return;
  }

  while( MAX_NOTE_DURATION < leftDuration ){    
    
    inputSingleNoteData( MAX_NOTE_DURATION, note, velocity, target );
    leftDuration -= MAX_NOTE_DURATION;

  }

  inputSingleNoteData( leftDuration, note, velocity, target );

}

// -- functions : Core function of inputNoteData()
const inputSingleNoteData = ( duration, note, velocity, target ) => {
  
  const NOTE_OFF_NUMBER = 128;

  target.push( duration );

	if( velocity > 0 ){
		target.push( note );
	}else{
		// velocity === 0.
		target.push( NOTE_OFF_NUMBER );
	}
  target.push( 0xFF );

}


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
            const cubeID = 1;
            changeConnectCubeButtonStatus( cubeID, undefined, true );
        }else if( cube === gCubes[1] ){
            turnOnLightGreen( cube );
            const cubeID = 2;
            changeConnectCubeButtonStatus( cubeID, undefined, true );
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
          enablePlaySampleSEButton();
          enablePlayNoteButton();
          enablePlayPreInSEButton();
          enableMIDIButton();
        }else if( cube === gCubes[1] ){
          turnOnLightGreen( cube );
        }else{
          turnOnLightRed( cube );
        }
    });

    return cube;
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

const turnOnLightRed = ( cube ) => {

    // Red light
    const buf = new Uint8Array([ 0x03, 0x00, 0x01, 0x01, 0xFF, 0x00, 0x00 ]);
    if( ( cube !== undefined ) && ( cube.lightChar !== undefined ) ){
        cube.lightChar.writeValue( buf );
    }

}


// -- Play Sound effect Commands
const playSE = ( cube, idSE ) => {

    // Play pre-install sound effect
    const buf = new Uint8Array([ 0x02, idSE, 0xFF ]);
    if( ( cube !== undefined ) && ( cube.soundChar !== undefined ) ){
        cube.soundChar.writeValue( buf );
    }

}

// -- Play Single note Commands
const playSingleNote = ( cube, note, duration ) => {

  // Specify single note sound
  const buf = new Uint8Array([ 0x01, 0x01, duration, note, 0xFF ]);
  playMelody( cube, buf );

}

// -- Play melody Commands
const playMelody = ( cube, melody ) => {

    // Play MIDI note numbers
    // Add 1 byte prefix( 0x03 = MIDI note numbers ) to melody
    const buf = new Uint8Array( melody.length + 1 );
    buf[0] = 0x03;
    buf.set( melody, 1 );
    if( ( cube !== undefined ) && ( cube.soundChar !== undefined ) ){
        cube.soundChar.writeValue( buf );
    }

    return buf;

}

// -- Stop any type of sound Commands
const stopSound = ( cubeID ) => {

    // Stop sound
    const buf = new Uint8Array([ 0x01 ]);
    const cube = gCubes[ cubeID ];

    if( ( cube !== undefined ) && ( cube.soundChar !== undefined ) ){

        const promise = cube.soundChar.writeValue( buf ).catch( error => {
            // re-try
            setTimeout( stopSound( cubeID ), 100 );
        });

    }

}

// -- On UI
const changeButtonStatus = ( btID, enabled ) => {
    document.getElementById( btID ).disabled = !enabled;
}

const changeConnectCubeButtonStatus = ( idButton, cube, enabled ) => {

    if( idButton ){
        changeButtonStatus( 'btConnectCube' + ( idButton + 1 ), enabled );
    }else{
        if( gCubes[0] === cube ){
            changeButtonStatus( 'btConnectCube1', enabled );
        }else if( gCubes[1] === cube ){
            changeButtonStatus( 'btConnectCube2', enabled );
        }else{
            changeButtonStatus( 'btConnectCube3', enabled );
        }
    }
    
}

const disablePlaySampleButton = () => { changeButtonStatus( 'btPlaySample', false ); }
const enablePlaySampleButton = () => { changeButtonStatus( 'btPlaySample', true ); }
const disableStopSampleButton = () => { changeButtonStatus( 'btStopSample', false ); }
const enableStopSampleButton = () => { changeButtonStatus( 'btStopSample', true ); }
const disablePlaySampleSEButton = () => { 
  changeButtonStatus( 'btPlaySampleSE1', false ); 
  changeButtonStatus( 'btPlaySampleSE2', false ); 
  changeButtonStatus( 'btPlaySampleSE3', false ); 
  changeButtonStatus( 'btPlaySampleSE4', false ); 
}
const enablePlaySampleSEButton = () => { 
  changeButtonStatus( 'btPlaySampleSE1', true ); 
  changeButtonStatus( 'btPlaySampleSE2', true ); 
  changeButtonStatus( 'btPlaySampleSE3', true ); 
  changeButtonStatus( 'btPlaySampleSE4', true ); 
}
const disablePlayNoteButton = () => { changeButtonStatus( 'btPlayNote', false ); }
const enablePlayNoteButton = () => { changeButtonStatus( 'btPlayNote', true ); }
const disablePlayPreInSEButton = () => { changeButtonStatus( 'btPlayPreInSE', false ); }
const enablePlayPreInSEButton = () => { changeButtonStatus( 'btPlayPreInSE', true ); }
const disablePlayMIDIButton = () => { changeButtonStatus( 'btPlayMIDI', false ); }
const enablePlayMIDIButton = () => { changeButtonStatus( 'btPlayMIDI', true ); }
const disableStopMIDIButton = () => { changeButtonStatus( 'btStopMIDI', false ); }
const enableStopMIDIButton = () => { changeButtonStatus( 'btStopMIDI', true ); }


// Play Sample SE
// -- main function
const playSampleSE = ( seId ) => {

  let melodyBuf;

  switch( seId ){
    case 1:
      melodyBuf = getSampleMelodyDroid();
      break;
    case 2:
      melodyBuf = getSampleMelodyGet();
      break;
    case 3:
      melodyBuf = getSampleMelodyThrow();
      break;
    case 4:
      melodyBuf = getSampleMelodyEnergy();
      break;
  }

  const cmdBuf = playMelody( gCubes[ 0 ], melodyBuf );
  playMelody( gCubes[ 1 ], melodyBuf );
  playMelody( gCubes[ 2 ], melodyBuf );

  updateCodeSampleSE( seId, cmdBuf );

}

const getSampleMelodyDroid = () => {
  
  const HIGHEST_NOTE = 105; // A8
  const LOWEST_NOTE  = 72;  // C6
  const OPERATION_NUM = 20;
  const DURATION = 4; // 40 msec
  const VELOCITY = 0xFF; 

  const buf = new Uint8Array( 2 + OPERATION_NUM * 3 );

  buf[ 0 ] = 0x01;
  buf[ 1 ] = OPERATION_NUM;

  // Voice sounds are generated randomly.
  for( let index = 0; index < OPERATION_NUM; index++ ){

    buf[ 2 + 3 * index ] = DURATION;
    buf[ 3 + 3 * index ] = getRandomNum( LOWEST_NOTE, HIGHEST_NOTE );;
    buf[ 4 + 3 * index ] = VELOCITY;    

  }

  return buf;
  
}

const getRandomNum = ( min, max ) => {
  return Math.floor( Math.random() * ( max + 1 - min ) ) + min;
}

const getSampleMelodyGet = () => {
  return new Uint8Array([ 0x01, 0x02, 0x8, 83, 0xFF, 64, 88, 0xFF ]);
}

const getSampleMelodyThrow = () => {
  return new Uint8Array([ 0x01, 0x03, 0x2, 43, 0xFF, 0x2, 55, 0xFF, 0x2, 67, 0xFF ]);
}

const getSampleMelodyEnergy = () => {
  return new Uint8Array([ 0x01, 27, 3, 60, 255, 3, 55, 255, 3, 60, 255, 3, 64, 255, 3, 67, 255, 
    3, 72, 255, 3, 67, 255, 3, 56, 255, 3, 60, 255, 3, 63, 255, 3, 68, 255, 3, 63, 255, 3, 68, 255, 
    3, 72, 255, 3, 75, 255, 3, 80, 255, 3, 75, 255, 3, 58, 255, 3, 62, 255, 3, 65, 255, 3, 70, 255, 
    3, 65, 255, 3, 70, 255, 3, 74, 255, 3, 77, 255, 3, 82, 255, 3, 77, 255 ]);
}


// Play Note
// -- main function
const playNote = () => {

  const note = new Number( document.getElementById( 'noteSlider' ).value );
  const duration = 30;

  for( let id of CUBE_ID_ARRAY ){

    if( gCubes[ id ] && gCubes[ id ].soundChar ){
      playSingleNote( gCubes[ id ], note, duration );
    }
    
  }

  updateCodeSingleNote( note, duration );

}

// -- Update and show description of the current note.
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
// -- Main function
const playPreInSE = () => {

  const idSE = new Number( document.getElementById( 'preInSE' ).value );

  for( let id of CUBE_ID_ARRAY ){

    if( gCubes[ id ] && gCubes[ id ].soundChar ){
      playSE( gCubes[ id ], idSE );
    }
    
  }

  updateCodePreInSE( idSE );

}


// Play MIDI Melody
// -- Main function
let gIsPlayingMIDIMelody = false;
let gPlayMIDIMelodyTimerID = [ undefined, undefined, undefined ];

const playMIDIMelody = () => {

  // Clear TimerID
  for( let id of CUBE_ID_ARRAY ){

    if( gPlayMIDIMelodyTimerID[ id ] !== undefined ){
      clearTimeout( gPlayMIDIMelodyTimerID[ id ] );
      gPlayMIDIMelodyTimerID[ id ] = undefined;
    }

  }

  gIsPlayingMIDIMelody = true;
  disablePlayMIDIButton();
  enableStopMIDIButton();
  disablePlaySampleButton();
  disablePlaySampleSEButton();
  disablePlayNoteButton();
  disablePlayPreInSEButton();

  for( let id of CUBE_ID_ARRAY ){

    if( getTrackId( id + 1 ) !== '0' ){

      gMelodyBufArray[ id ] = new Uint8Array( gMelodyTracksOriginal[ getTrackId( id + 1 ) - 1 ] );
      playMIDIMelodyCore( id );

    }

  } 

}

// -- Core function
const playMIDIMelodyCore = ( cubeId ) => {

  const melodyBufArray = gMelodyBufArray[ cubeId ];
  if( ( melodyBufArray === undefined ) 
        || ( gIsPlayingMIDIMelody === false ) ){
    return;
  }

  let duration;
  if( melodyBufArray.length > MAX_SOUND_BINARY_NUM ){

    // Operation length is MAX_SOUND_OPERATION_NUM. 
    const buf = new Uint8Array( MAX_SOUND_BINARY_NUM + 2 );

    buf[0] = 0x01;
    buf[1] = MAX_SOUND_OPERATION_NUM;
    const currentMelodyArray = melodyBufArray.slice( 0, MAX_SOUND_BINARY_NUM );
    buf.set( currentMelodyArray, 2 );
    // console.log( 'MIDI playmelody buf: ' + buf );

    playMelody( gCubes[ cubeId ], buf );
    duration = getDurationOfMelody( currentMelodyArray );
    gMelodyBufArray[ cubeId ] = 
      melodyBufArray.slice( MAX_SOUND_BINARY_NUM, melodyBufArray.length );

  }else{

    // This is the last part.
    const buf = new Uint8Array( melodyBufArray.length + 2 );

    buf[0] = 0x01;
    buf[1] = melodyBufArray.length / 3;
    const currentMelodyArray = melodyBufArray;
    buf.set( currentMelodyArray, 2 );
    // console.log( 'MIDI playmelody buf: ' + buf );

    playMelody( gCubes[ cubeId ], buf );
    duration = getDurationOfMelody( currentMelodyArray );
    gMelodyBufArray[ cubeId ] = undefined;

  }

  let callback = undefined;
  switch( cubeId ){
    case 0:
      callback = onNextMIDIMelodyCube1;
      break;
    case 1:
      callback = onNextMIDIMelodyCube2;
      break;
    case 2:
      callback = onNextMIDIMelodyCube3;
      break;
  }
  gPlayMIDIMelodyTimerID[ cubeId ] = setTimeout( callback, duration );

}

// -- Callbacks for continuous playing
const onNextMIDIMelodyCube1 = () => { onNextMIDIMelody( 0 ); }
const onNextMIDIMelodyCube2 = () => { onNextMIDIMelody( 1 ); }
const onNextMIDIMelodyCube3 = () => { onNextMIDIMelody( 2 ); }

const onNextMIDIMelody = ( cubeId ) => {
  if( gMelodyBufArray[ cubeId ] === undefined ){
    endPlayMIDIMelody();
  }else{
    playMIDIMelodyCore( cubeId );
  }
}

const endPlayMIDIMelody = () => {

  // console.log( 'endPlayMIDIMelody' );
  
  if( gIsPlayingMIDIMelody ){
    gIsPlayingMIDIMelody = false;
    disableStopMIDIButton();
    enablePlayMIDIButton();
    enablePlaySampleButton();
    enablePlaySampleSEButton();
    enablePlayNoteButton();
    enablePlayPreInSEButton();
  }

}

// -- stop playing MIDI melody
const stopMIDIMelody = () => {

  // Clear TimerID
  for( let id of CUBE_ID_ARRAY ){

    if( gPlayMIDIMelodyTimerID[ id ] !== undefined ){
      clearTimeout( gPlayMIDIMelodyTimerID[ id ] );
      gPlayMIDIMelodyTimerID[ id ] = undefined;
    }

    if( gCubes[ id ] ){ stopSound( id ); }

  }

  if( gIsPlayingMIDIMelody ){
    gIsPlayingMIDIMelody = false;
    disableStopMIDIButton();
    enablePlayMIDIButton();
    enablePlayNoteButton();
    enablePlaySampleSEButton();
    enablePlayPreInSEButton();
    enablePlaySampleButton();
  }

}


// Sample Melody
let gIsPlayingSampleMelody = false;
let gPlaySampleMolodyTimerID = undefined;

// -- Main function
const playSampleMelody = () => {

    gIsPlayingSampleMelody = true;
    playSampleMelodyUp();

}

const playSampleMelodyUp = () => { playSampleMelodyCore( true ); }
const playSampleMelodyDown = () => { playSampleMelodyCore( false ); }

// -- Core function
const playSampleMelodyCore = ( isUp ) => {
    
  const NUM_OPERATION = MAX_SOUND_OPERATION_NUM;
  const DURATION = 0x05;

  for( let cubeID of CUBE_ID_ARRAY ){
    playMelody( gCubes[ cubeID ], getSampleMelodyBuf( cubeID, isUp ) );
  }  

  gPlaySampleMolodyTimerID = setTimeout( 
      isUp ? playSampleMelodyDown : playSampleMelodyUp, 
          DURATION * NUM_OPERATION * 10 );

}

// Generate sample melody
const getSampleMelodyBuf = ( cubeID, isUp ) => {
  
  const REPEAT_COUNT = 0x01;
  const LONG_DURATION = 0x64;
  const BASE_NOTE = 0x1F + cubeID * 5;
  const MAX_VOLUME = 0xFF;
  const DURATION = 0x05;

  const NUM_OPERATION = MAX_SOUND_OPERATION_NUM;
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

  return melody;

}

// -- Stop sample melody
const stopSampleMelody = () => {

  // Clear TimerID
  if( gPlaySampleMolodyTimerID !== undefined ){
      clearTimeout( gPlaySampleMolodyTimerID );
      gPlaySampleMolodyTimerID = undefined;
  }

  if( gCubes[0] ){ stopSound( 0 ); }
  if( gCubes[1] ){ stopSound( 1 ); }
  if( gCubes[2] ){ stopSound( 2 ); }

  if( gIsPlayingSampleMelody ){
      gIsPlayingSampleMelody = false;
      disableStopSampleButton();
      enablePlaySampleButton();
      enablePlaySampleSEButton();
      enablePlayNoteButton();
      enablePlayPreInSEButton();
      enablePlayMIDIButton();
  }

}


// Copy Code
// -- Update code with specified text.
const updateCode = ( codeText ) => {
  
  document.getElementById( 'outputCode' ).innerHTML = codeText;
  document.getElementById( 'outputCode' ).setAttribute( 'class', 'prettyprint lang-js linenums' );
  PR.prettyPrint();

}

// -- Show default
const showDefaultMessageCode = () => {

  const stringForToioJs = 
    '\n\n/* \n' + 
    '  Sound data will be shown in this region.\n' + 
    '  Anytime, you can copy code by pushing the button below. \n' + 
    '*/ \n\n\n\n\n\n\n';
  
  updateCode( stringForToioJs );

}
showDefaultMessageCode();

// -- For playing single note
const updateCodeSingleNote = ( note, duration ) => {

  const codeText = '\n /* Play Single Note */ \n\n' + 
    'const buf = new Uint8Array([ 0x03, 0x01, 0x01, ' + 
    '0x' + dexToHexString2gidits( duration ) + ', ' + 
    '0x' + dexToHexString2gidits( note ) + 
    ', 0xFF ]); \n\n\n\n\n\n\n\n\n';

  updateCode( codeText );

}

// -- For playing Pre-installed SE.
const updateCodePreInSE = ( idSE ) => {

  const codeText = '\n /* Play Pre-installed Sound Effect */ \n\n' + 
    'const buf = new Uint8Array([ 0x02, ' + 
    '0x' + dexToHexString2gidits( idSE ) +  
    ', 0xFF ]); \n\n\n\n\n\n\n\n\n';
  
  updateCode( codeText );

}

// -- For playing Sample SE.
const updateCodeSampleSE = ( seID, cmdBuf ) => {

  let codeText = '\n /* Play Sample Sound Effect ' + 
    seID + ' */ \n\n' + 'const buf = new Uint8Array([ '; 
  
  for( let item of cmdBuf ){
    codeText += '0x' + dexToHexString2gidits( item ) + ', ';
  }
  
  codeText = codeText.slice( 0, -2 );
  codeText += ' ]);\n\n\n\n\n\n\n\n';

  updateCode( codeText );

}

// -- For playing MIDI.
const updateCodeMIDI = ( selectedTrackIDs, melodyTracks ) => {

  let codeText = '\n/* Play MIDI melody */ \n\n';

  for( let cubeID of CUBE_ID_ARRAY ){

    const trackID = selectedTrackIDs[ cubeID ];
    const track = melodyTracks[ trackID ];
    // console.log( track );
    if( track === undefined ){
      continue;
    }

    codeText += '/* Track ' + ( trackID + 1 ) + ' */ \n';

    let count = 0;
    let leftSoundNum = track.length;

    while( leftSoundNum > 0 ){
      
      const soundBinaryNum = 
        leftSoundNum < MAX_SOUND_BINARY_NUM ? leftSoundNum : MAX_SOUND_BINARY_NUM;

      codeText += 
      'const track' + ( trackID + 1 ) + '_' + ( count + 1 ) +
      ' = new Uint8Array([ 0x03, 0x01, ' + 
      '0x' + dexToHexString2gidits( soundBinaryNum / 3 ) + ', ';

      const offset = count * MAX_SOUND_BINARY_NUM;
      const soundBinaryArray = track.slice( offset, soundBinaryNum + offset );

      for( let item of soundBinaryArray ){
        codeText += '0x' + dexToHexString2gidits( item ) + ', ';
      }
      
      codeText = codeText.slice( 0, -2 );
      codeText += ' ]);\n\n';

      count++;
      leftSoundNum -= soundBinaryNum;
      
    }

  }

  // If all tracks are OFF
  if( ( melodyTracks[ selectedTrackIDs[ 0 ] ] === undefined ) && 
    ( melodyTracks[ selectedTrackIDs[ 1 ] ] === undefined ) ){
    showDefaultMessageCode();
  }else{
    updateCode( codeText );
  }

}

// -- convert decimal to 0x** format.
const dexToHexString2gidits = ( dec ) => {

  let retValue = '';

  if( dec < 0x10 ){
    retValue += '0'
  }

  retValue += dec.toString(16).toUpperCase();
  return retValue;

}

document.getElementById( 'copyCode' ).addEventListener( 'click', async ev => {
  copyCode( document.getElementById( 'outputCode' ).innerText );
});

// from https://qiita.com/simiraaaa/items/2e7478d72f365aa48356
function copyCode( string ){

	const temp = document.createElement( 'div' );
	temp.appendChild( document.createElement('pre') ).textContent = string;

	const s = temp.style;
	s.position = 'fixed';
	s.left = '-100%';

	document.body.appendChild( temp );
	document.getSelection().selectAllChildren( temp );
	const result = document.execCommand('copy');
  document.body.removeChild( temp );
  
  return result;
  
}


// Initialize 
const initialize = () => {
    
  // Event Listning for GUI buttons.
  for( let cubeId of CUBE_ID_ARRAY ){
      document.getElementById( 'btConnectCube' + ( cubeId + 1 ) ).addEventListener( 'click', async ev => {

          if( cubeId === 0 ){
              gCubes[0] = connectNewCube();
          }else if( cubeId === 1 ){
              gCubes[1] = connectNewCube();
          }else{
              gCubes[2] = connectNewCube();
          }
          
      });
  }

  // For single note
  document.getElementById( 'noteSlider' ).addEventListener( 'change', async ev => {
    playNote();
  });
  document.getElementById( 'noteSlider' ).addEventListener( 'input', async ev => {
    updateNoteText();
  });
  document.getElementById( 'btPlayNote' ).addEventListener( 'click', async ev => {
    playNote();
  });
  
  // For pre installed SE
  document.getElementById( 'preInSE' ).addEventListener( 'change', async ev => {
    playPreInSE();
  });
  document.getElementById( 'btPlayPreInSE' ).addEventListener( 'click', async ev => {
    playPreInSE();
  });

  // For play sample
  document.getElementById( 'btPlaySample' ).addEventListener( 'click', async ev => {
      disablePlaySampleButton();
      disablePlayNoteButton();
      disablePlaySampleSEButton();
      disablePlayPreInSEButton();
      disablePlayMIDIButton();
      enableStopSampleButton();
      playSampleMelody();
  });
  document.getElementById( 'btStopSample' ).addEventListener( 'click', async ev => {
    stopSampleMelody();
  });

  // For play sample SE
  document.getElementById( 'btPlaySampleSE1' ).addEventListener( 'click', async ev => {
    playSampleSE( 1 );
  });
  document.getElementById( 'btPlaySampleSE2' ).addEventListener( 'click', async ev => {
    playSampleSE( 2 );
  });
  document.getElementById( 'btPlaySampleSE3' ).addEventListener( 'click', async ev => {
    playSampleSE( 3 );
  });
  document.getElementById( 'btPlaySampleSE4' ).addEventListener( 'click', async ev => {
    playSampleSE( 4 );
  });

  // For MIDI play
  document.getElementById( 'MIDITrackCube1' ).addEventListener( 'change', async ev => {
    updateCodeMIDI( getSelectedTrackIndex(), gMelodyTracksOriginal );
  });
  document.getElementById( 'MIDITrackCube2' ).addEventListener( 'change', async ev => {
    updateCodeMIDI( getSelectedTrackIndex(), gMelodyTracksOriginal );
  });  
  document.getElementById( 'btPlayMIDI' ).addEventListener( 'click', async ev => {
    playMIDIMelody();
  });
  document.getElementById( 'btStopMIDI' ).addEventListener( 'click', async ev => {
    stopMIDIMelody();
  });
  disablePlayMIDIButton();

  // For showing readme
  document.getElementById( 'btShowReadme' ).addEventListener( 'click', async ev => {
      window.open( 'https://github.com/tetunori/toioCoreCubeSoundChecker/blob/master/README.md', '_blank' );
  });
  
}
initialize();

