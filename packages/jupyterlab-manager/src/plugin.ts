// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  DocumentRegistry
} from '@jupyterlab/docregistry';

import {
  INotebookModel
} from '@jupyterlab/notebook';

import {
  NotebookPanel
} from '@jupyterlab/notebook';

import {
  JupyterLabPlugin, JupyterLab
} from '@jupyterlab/application';

import {
  IDisposable, DisposableDelegate
} from '@phosphor/disposable';

import {
  WidgetRenderer
} from './renderer';

import {
  WidgetManager
} from './manager';

import {
  OutputModel, OutputView, OUTPUT_WIDGET_VERSION
} from './output';

import * as base from '@jupyter-widgets/base';
import * as widgets from '@jupyter-widgets/controls';

import '@jupyter-widgets/base/css/index.css';
import '@jupyter-widgets/controls/css/widgets-base.css';


const WIDGET_MIMETYPE = 'application/vnd.jupyter.widget-view+json';

export
type INBWidgetExtension = DocumentRegistry.IWidgetExtension<NotebookPanel, INotebookModel>;


export
class NBWidgetExtension implements INBWidgetExtension {
  /**
   * Create a new extension object.
   */
  createNew(nb: NotebookPanel, context: DocumentRegistry.IContext<INotebookModel>): IDisposable {
    let wManager = new WidgetManager(context, nb.rendermime);
    this._registry.forEach(data => wManager.register(data));
    nb.rendermime.addFactory({
      safe: false,
      mimeTypes: [WIDGET_MIMETYPE],
      createRenderer: (options) => new WidgetRenderer(options, wManager)
    }, 0);
    return new DisposableDelegate(() => {
      if (nb.rendermime) {
        nb.rendermime.removeFactory(WIDGET_MIMETYPE);
      }
      wManager.dispose();
    });
  }

  /**
   * Register a widget module.
   */
  registerWidget(data: base.IWidgetRegistryData) {
    this._registry.push(data);
  }
  private _registry: base.IWidgetRegistryData[] = [];
}


/**
 * The widget manager provider.
 */
const widgetManagerProvider: JupyterLabPlugin<base.IJupyterWidgetRegistry> = {
  id: 'jupyter.extensions.nbWidgetManager',
  provides: base.IJupyterWidgetRegistry,
  activate: activateWidgetExtension,
  autoStart: true
};

export default widgetManagerProvider;


class LazyPromise<T> implements Promise<T> {
  constructor(fn: () => Promise<T>) {
    this._fn = fn;
  }

  then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): Promise<TResult1 | TResult2> {
    if (this._promise === null) {
      this._promise = this._fn();
    }
    return this._promise.then.apply(this, arguments);
  }

  catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): Promise<T | TResult> {
    if (this._promise === null) {
        this._promise = this._fn();
      }
    return this._promise.catch.apply(this, arguments);
  }


  private _fn: () => Promise<T>;
  private _promise: Promise<T> = null;
}

/**
 * Activate the widget extension.
 */
function activateWidgetExtension(app: JupyterLab): base.IJupyterWidgetRegistry {
  let extension = new NBWidgetExtension();
  extension.registerWidget({
    name: '@jupyter-widgets/base',
    version: base.JUPYTER_WIDGETS_VERSION,
    exports: {
      WidgetModel: base.WidgetModel,
      WidgetView: base.WidgetView,
      DOMWidgetView: base.DOMWidgetView,
      DOMWidgetModel: base.DOMWidgetModel,
      LayoutModel: base.LayoutModel,
      LayoutView: base.LayoutView,
      StyleModel: base.StyleModel,
      StyleView: base.StyleView
    }
  });
  extension.registerWidget({
    name: '@jupyter-widgets/controls',
    version: widgets.JUPYTER_CONTROLS_VERSION,
    exports: new LazyPromise(() => import('@jupyter-widgets/controls'))
  });
  extension.registerWidget({
    name: '@jupyter-widgets/output',
    version: OUTPUT_WIDGET_VERSION,
    exports: {OutputModel, OutputView}
  });

  app.docRegistry.addWidgetExtension('Notebook', extension);
  return {
    registerWidget(data: base.IWidgetRegistryData): void {
      extension.registerWidget(data);
    }
  };
}
