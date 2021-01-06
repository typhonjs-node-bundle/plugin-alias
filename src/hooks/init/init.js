const PluginLoader = require('../../loader/PluginLoader');

/**
 * Oclif init hook to add PluginHandler to plugin manager.
 *
 * @param {object} opts - options of the CLI action.
 *
 * @returns {Promise<void>}
 */
module.exports = async function(opts)
{
   try
   {
      global.$$pluginManager.add({ name: '@typhonjs-node-rollup/plugin-alias', instance: PluginLoader,
         options: {
            command: opts.id
         }
      });

      global.$$eventbus.trigger('log:debug', `plugin-alias init hook running '${opts.id}'.`);
   }
   catch (error)
   {
      this.error(error);
   }
};