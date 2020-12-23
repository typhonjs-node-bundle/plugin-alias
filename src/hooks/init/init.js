const { flags }   = require('@oclif/command');

/**
 * Handles interfacing with the plugin manager adding event bindings to pass back a configured
 * instance of `@rollup/plugin-alias`.
 *
 * @example fvttdev build --alias somepackage=newpackage'
 */
class PluginHandler
{
   /**
    * @returns {string}
    */
   static test() { return 'some testing'; }

   /**
    * Wires up PluginHandler on the plugin eventbus.
    *
    * @param {PluginEvent} ev - The plugin event.
    *
    * @see https://www.npmjs.com/package/typhonjs-plugin-manager
    *
    * @ignore
    */
   static onPluginLoad(ev)
   {
      // TODO: ADD EVENT REGISTRATION
      // eventbus.on(`${eventPrepend}test`, PluginHandler.test, PluginHandler);
   }
}

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
      process.pluginManager.add({ name: 'plugin-alias', instance: PluginHandler });

      // Adds flags for various built in commands like `build`.
      s_ADD_FLAGS(opts.id);

      // TODO REMOVE
      process.stdout.write(`plugin-alias init hook running ${opts.id}\n`);
   }
   catch (error)
   {
      this.error(error);
   }
};

/**
 * Adds flags for various built in commands like `build`.
 *
 * To add handling of the *.env environment variables a double processing stage occurs in fvttdev build command. The
 * flags are processed to pull out the --env flag then if present `dotenv` is used to load the given *.env file.
 * We take advantage of the `default` definition for the `alias` flag below by providing a function that checks the
 * associated environment variable `DEPLOY_ALIAS`. If it is present then it is treated as a JSON array and any
 * parsing errors will halt execution of the CLI w/ the parse error shown to the user.
 *
 * A verification function is provided for FlagHandler which ensures that each entry is formatted as <xxx>=<yyy>
 * splitting the left and right hand values formatting the output into the key / value arrangement expected by
 * `@rollup/plugin-alias`. Errors  will be thrown if the formatting is incorrect.
 *
 * @param {string} command - ID of the command being run.
 */
function s_ADD_FLAGS(command)
{
   switch (command)
   {
      // Add all built in flags for the build command.
      case 'build':
         process.eventbus.trigger('oclif:system:flaghandler:add', {
            command,
            plugin: 'plugin-alias',
            flags: {
               alias: flags.string({
                  'char': 'a',
                  'description': 'Map imports to different modules.',
                  'multiple': true,
                  'default': function()
                  {
                     if (typeof process.env.DEPLOY_ALIAS === 'string')
                     {
                        let result = void 0;

                        // Treat it as a JSON array.
                        try { result = JSON.parse(process.env.DEPLOY_ALIAS); }
                        catch (error)
                        {
                           const parseError = new Error(
                            `Could not parse 'DEPLOY_ALIAS' as a JSON array;\n${error.message}`);

                           // Set magic boolean for global CLI error handler to skip treating this as a fatal error.
                           parseError.$$bundler_fatal = false;

                           throw parseError;
                        }

                        if (!Array.isArray(result))
                        {
                           const parseError = new Error(`Please format 'DEPLOY_ALIAS' as a JSON array.`);

                           // Set magic boolean for global CLI error handler to skip treating this as a fatal error.
                           parseError.$$bundler_fatal = false;

                           throw parseError;
                        }

                        return result;
                     }

                     return void 0;
                  }
               })
            },
            verify: function(flags)
            {
               const regex = /(.+)=(.+)/;

               // Alias should always be an array
               if (Array.isArray(flags.alias))
               {
                  const badEntries = [];
                  const entries = [];

                  flags.alias.forEach((entry) =>
                  {
                     const matches = regex.exec(entry);
                     if (matches !== null && matches.length >= 3)
                     {
                        entries.push({ find: matches[1], replacement: matches[2] });
                     }
                     else
                     {
                        badEntries.push(entry);
                     }
                  });

                  flags.alias = entries;

                  if (badEntries.length > 0)
                  {
                     const error = new Error(`plugin-alias verify; can not parse ${JSON.stringify(badEntries)} each `
                      + `entry must be in the format of <xxx>=<yyy>.`);

                     error.$$bundler_fatal = false;

                     throw error;
                  }
               }
            }
         });
         break;
   }
}