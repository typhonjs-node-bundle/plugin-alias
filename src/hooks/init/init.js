const PluginLoader = require('../../loader/PluginLoader');

/**
 * Oclif init hook to add PluginHandler to plugin manager.
 *
 * @param {object} options - options of the CLI action.
 *
 * @returns {Promise<void>}
 */
module.exports = async function(options)
{
   try
   {
      global.$$pluginManager.add({ name: PluginLoader.pluginName, instance: PluginLoader, options });

      global.$$eventbus.trigger('log:debug', `plugin-alias init hook running '${options.id}'.`);
   }
   catch (error)
   {
      this.error(error);
   }
};