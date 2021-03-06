import alias             from '@rollup/plugin-alias';
import { flags }         from '@oclif/command';
import { NonFatalError } from '@typhonjs-node-bundle/oclif-commons';

const s_CONFLICT_PACKAGES = ['@rollup/plugin-alias'];
const s_PACKAGE_NAME = '@typhonjs-node-rollup/plugin-alias';

/**
 * Handles interfacing with the plugin manager adding event bindings to pass back a configured
 * instance of `@rollup/plugin-alias`.
 *
 * @example fvttdev build --alias somepackage=newpackage'
 */
export default class PluginLoader
{
   /**
    * Returns the any modules that cause a conflict.
    *
    * @returns {string[]}
    */
   static get conflictPackages() { return s_CONFLICT_PACKAGES; }

   /**
    * Returns the `package.json` module name.
    *
    * @returns {string}
    */
   static get packageName() { return s_PACKAGE_NAME; }

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
    * Added flags include:
    * `--alias`   - `-a` - Map imports to different modules..  - default:           - env: {prefix}_ALIAS
    *
    * @param {object} eventbus - The eventbus to add flags to.
    */
   static addFlags(eventbus)
   {
      eventbus.trigger('typhonjs:oclif:system:flaghandler:add', {
         command: 'bundle',
         pluginName: PluginLoader.packageName,
         flags: {
            alias: flags.string({
               'char': 'a',
               'description': 'Map imports to different modules.',
               'multiple': true,
               'default': function(envVars = process.env)
               {
                  const envVar = `${global.$$flag_env_prefix}_ALIAS`;

                  if (typeof envVars[envVar] === 'string')
                  {
                     let result = void 0;

                     // Treat it as a JSON array.
                     try { result = JSON.parse(envVars[envVar]); }
                     catch (error)
                     {
                        throw new NonFatalError(
                         `Could not parse '${envVar}' as a JSON array;\n${error.message}`);
                     }

                     if (!Array.isArray(result))
                     {
                        throw new NonFatalError(`Please format '${envVar}' as a JSON array.`);
                     }

                     return result;
                  }

                  return void 0;
               }
            })
         },

         /**
          * Verifies the `alias` flag and checks that the data loaded is an array, and then attempts to parse
          * each
          * entry. If an entry is not a string in the format of <xxx>=<yyy> an error is generated. An error is
          * also generated if an entry overwrites a previous entry which occurs when there are multiple left hand
          * values of the same string.
          *
          * @param {object}   flags - The CLI flags to verify.
          */
         verify: function(flags)
         {
            const regex = /(.+)=(.+)/;

            // Alias should always be an array
            if (Array.isArray(flags.alias))
            {
               const badEntries = [];
               const warnEntries = [];

               const entries = [];

               flags.alias.forEach((entry) =>
               {
                  const matches = regex.exec(entry);

                  if (matches !== null && matches.length >= 3)
                  {
                     // We need to test each previous entry in the entries array to detect any left hand
                     // values that may override previously set values. Since entries are objects and we need to
                     // test `{ find: ??? }` against `matches[1]` we can accomplish this with a reducer function
                     // which starts off false, but accumulates a boolean by _or equals_ such that once accum is
                     // true it stays true. This allows us to accomplish this task in the line below with easier
                     // control flow. Now you know!
                     if (entries.reduce((accum, value) => accum |= value.find === matches[1], false))
                     {
                        warnEntries.push(entry);
                     }
                     else
                     {
                        entries.push({ find: matches[1], replacement: matches[2] });
                     }
                  }
                  else
                  {
                     badEntries.push(entry);
                  }
               });

               flags.alias = { entries };

               let errorMessage = 'plugin-alias verification failure:\n';

               if (badEntries.length > 0)
               {
                  errorMessage += `- can not parse ${JSON.stringify(badEntries)} each `
                     + `entry must be a 'string' in the format of '<xxx>=<yyy>'.`;
               }

               if (warnEntries.length > 0)
               {
                  errorMessage += `${badEntries.length > 0 ? '\n' : ''}- the following `
                     + `entries overwrite previous entries ${JSON.stringify(warnEntries)}.`;
               }

               if (errorMessage !== 'plugin-alias verification failure:\n')
               {
                  throw new NonFatalError(errorMessage);
               }
            }
         }
      });
   }

   /**
    * Returns the configured input plugin for `@rollup/plugin-alias`
    *
    * @param {object} bundleData          - The CLI config
    * @param {object} bundleData.cliFlags - The CLI config
    *
    * @returns {object} Rollup plugin
    */
   static getInputPlugin(bundleData = {})
   {
      if (bundleData.cliFlags && typeof bundleData.cliFlags.alias === 'object')
      {
         return alias(bundleData.cliFlags.alias);
      }
   }

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
      ev.eventbus.on('typhonjs:oclif:bundle:plugins:main:input:get', PluginLoader.getInputPlugin, PluginLoader);

      PluginLoader.addFlags(ev.eventbus);
   }
}
