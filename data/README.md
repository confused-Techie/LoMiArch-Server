This folder itself should save as the one folder containing all persistent data.

This allows easy bundling into Docker in the future, with specific folders for each purpose.

* config

This folder contains all configuration values. It's where a user can save their configuration file,
as well as any other configuration helpers.

Additionally the index file is saved here.

* data

This will be the folder to actually contain all the media files. Allowing easy manipulation or addition.

* resources

This folder will contain any tools that need to be installed. Such as `yt-dlp`.

This allows the user to install their own as needed or change versions. Or potentially could allow easy bundling of scripts to install these automatically.
