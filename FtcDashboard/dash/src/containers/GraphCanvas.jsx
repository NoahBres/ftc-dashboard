import React from 'react';
import PropTypes from 'prop-types';

import Graph from './Graph';
import AutoFitCanvas from '../components/AutoFitCanvas';

class GraphCanvas extends React.Component {
  constructor(props) {
    super(props);

    this.canvasRef = React.createRef();

    this.renderGraph = this.renderGraph.bind(this);
  }

  componentDidMount() {
    this.graph = new Graph(this.canvasRef.current, this.props.options);
    this.renderGraph();
  }

  componentWillUnmount() {
    if (this.requestId) {
      cancelAnimationFrame(this.requestId);
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.paused !== this.props.paused) {
      if (this.requestId) cancelAnimationFrame(this.requestId);

      if (!this.props.paused) this.renderGraph();
    } else {
      this.graph.addSamples(this.props.samples);
    }
  }

  renderGraph() {
    if (!this.props.paused && this.graph) {
      this.graph.render();
      this.requestId = requestAnimationFrame(this.renderGraph);
    }
  }

  clearGraph() {
    this.graph.clear();
  }

  render() {
    const hasGraphableContent = this.graph?.samples.length > 0;

    return (
      <div className="h-full flex-center flex-grow">
        <div
          className={`${
            this.graph === null || !hasGraphableContent ? 'hidden' : ''
          } w-full h-full`}
        >
          <AutoFitCanvas ref={this.canvasRef} />
        </div>
        <div className="absolute top-0 left-0 w-full h-full flex-center pointer-events-none">
          {(this.graph === null || !hasGraphableContent) && (
            <p className="text-center">No content to graph</p>
          )}
        </div>
      </div>
    );
  }
}

GraphCanvas.propTypes = {
  samples: PropTypes.arrayOf(
    PropTypes.shape({
      timestamp: PropTypes.number,
      data: PropTypes.array,
    }),
  ).isRequired,
  options: PropTypes.object,
  paused: PropTypes.bool,
};

export default GraphCanvas;
