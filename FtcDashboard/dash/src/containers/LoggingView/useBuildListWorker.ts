// Explanation on why workers have a very weird shim going on
// requiring a hook middle man
// https://github.com/developit/workerize-loader/issues/5#issuecomment-570663710

import createWorker from 'workerize-loader!./buildList.worker';
import * as BuildListWorker from './buildList.worker';

const buildListWorker = createWorker<typeof BuildListWorker>();

const useBuildListWorker = () => buildListWorker;

export default useBuildListWorker;
