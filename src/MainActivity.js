import React, { Component } from 'react';
import RecognizerComponent from './components/RecognizerComponent';
import WorkspaceComponent from './components/WorkspaceComponent';
import NotationComponent from './components/NotationComponent';
import { Link } from 'react-router-dom';

class MainActivity extends Component {
    state = {
        renderComponent: 'input',
        noteSequence: null,
        selectedTS: "",
        selectedQZ: 0,
        selectedTP: 0,
    };

    switchComponent = (componentName) => {
        this.setState({ renderComponent: componentName });
    }

    takeOutMusicData = (noteSequence,ts,qz,tp) => {
        this.setState({ noteSequence: noteSequence,
                        selectedTS: ts,
                        selectedQZ: qz,
                        selectedTP: tp, 
                        renderComponent: 'main' });
    }

    render() {
        let componentToRender;

        switch(this.state.renderComponent) {
            case 'input':
                componentToRender = <RecognizerComponent 
                complete = {this.takeOutMusicData}/>;
                break;
            case 'main':
                componentToRender = <WorkspaceComponent
                complete = {this.takeOutNoteSequence}
                notes = {this.state.noteSequence} />;
                break;
            case 'output':
                componentToRender = <NotationComponent />;
                break;
            default:
                componentToRender = <RecognizerComponent />;
        }

        return (
            <div className='main-activity-container'>
                {componentToRender}
            </div>
        );
    }
}

export default MainActivity;