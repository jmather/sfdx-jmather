import { flags, SfdxCommand } from '@salesforce/command';
import { Messages } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import { writeFileSync, mkdirSync, existsSync } from 'fs';

import { safeDump } from 'js-yaml';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('sfdx-jmather', 'objexport');

export default class Objexport extends SfdxCommand {
  public static description = messages.getMessage('commandDescription');

  public static examples = [
    `$ sfdx jmather:objexport --targetusername myOrg@example.com
  `,
    `$ sfdx jmather:objexport --targetusername myOrg@example.com
  `
  ];

  public static args = [];

  protected static flagsConfig = {
    // flag with a value (-o, --output=VALUE)
    output: flags.string({char: 'o', description: messages.getMessage('outputFlagDescription')}),
    filter: flags.string({char: 'i', description: messages.getMessage('filterFlagDescription')}),
    force: flags.boolean({char: 'f', description: messages.getMessage('forceFlagDescription')}),
    split: flags.boolean({char: 's', description: messages.getMessage('splitFlagDescription')})
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = true;

  // Comment this out if your command does not support a hub org username
  protected static supportsDevhubUsername = false;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = false;

  public async run(): Promise<AnyJson> {
    const outputFile = this.flags.output || (this.flags.split ? 'object-schema' : 'object-schema.yaml');
    const filterResults = !!this.flags.filter;
    const filterValue = (filterResults) ? this.flags.filter.toLowerCase() : '';

    // this.org is guaranteed because requiresUsername=true, as opposed to supportsUsername
    const conn = this.org.getConnection();
    const allDescriptions = await conn.describeGlobal();
    const describes = {};

    for (const desc of allDescriptions.sobjects) {
      this.ux.log(`${desc.label} - ${desc.name}`);

      if (!filterResults
        || filterResults
            && (desc.name.toLowerCase().indexOf(filterValue) > -1
                || desc.label.toLowerCase().indexOf(filterValue) > -1)) {
        describes[desc.name] = await conn.describe(desc.name);
      }
    }

    if (this.flags.split) {
      if (existsSync(outputFile) === false) {
        mkdirSync(outputFile);
      }

      for (const desc in describes) {
        if (desc) {
          const file = `${outputFile}/${desc}.yaml`;
          writeFileSync(file, safeDump(describes[desc]));
        }
      }
    } else {
      writeFileSync(outputFile, safeDump(describes));
    }

    // Return an object to be displayed with --json
    return describes;
  }
}
