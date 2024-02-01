import React, { Component } from 'react';
import RecognizerComponent from './components/RecognizerComponent';
import WorkspaceComponent from './components/WorkspaceComponent';
import NotationComponent from './components/NotationComponent';
import { Link } from 'react-router-dom';

class MainActivity extends Component {
    state = {
        renderComponent: 'input',
        noteSequence: null
    };

    switchComponent = (componentName) => {
        this.setState({ renderComponent: componentName });
    }

    takeOutNoteSequence = (noteSequence) => {
        this.setState({ noteSequence: noteSequence,
                        renderComponent: 'main' });
    }

    render() {
        let componentToRender;

        switch(this.state.renderComponent) {
            case 'input':
                componentToRender = <RecognizerComponent 
                complete = {this.takeOutNoteSequence}/>;
                break;
            case 'main':
                componentToRender = <WorkspaceComponent />;
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