# Translate Chat Plugin
A plugin for [Hindenburg](https://github.com/skeldjs/Hindenburg) to automatically
translate chat messages to each player's locale.

![image](https://user-images.githubusercontent.com/60631511/124961300-300c9c80-e015-11eb-991c-8027deebaf7b.png)

This is more of a "proof of concept", and shouldn't be used in production:
- The API, while free and relatively accurate, has a pretty slow response time, so
not really appropriate for real-time messaging.
- It is also probably heavily rate-limited, so a server with lots of messages
being sent across the network would struggle to keep within bounds.
- You could use it in production, but would require a fork using a more appropriate
service, such as the Google Translate or Yandex Translate APIs.

Uses a free [Libre Translate](https://libretranslate.com/) mirror hosted at
https://libretranslate.de.

## Installation
`yarn install-plugin hbplugin-translate-chat`

Or `git clone https://github.com/edqx/hbplugin-translate-chat` in your hindenburg's
plugin directory. (Remember to install & build the plugin in the directory.)

## Configuration
Add `"herpderp": true` to your configuration to make it.. herp derp.

Add `"translationService": "<address>"` to change the hostname for the libre
translate service. Useful if you decide to self-host libre translate. 

```json
{
    "plugins": {
        "hbplugin-translate-chat": {
            "herpderp": true,
            "translationService": "https://translate.mentality.rip"
        }
    }
}
```
