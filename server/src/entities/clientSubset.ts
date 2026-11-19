import type {
    Currency as ClientCurrency,
    CurrentUser,
    Discipline as ClientDiscipline,
    Position as ClientPosition,
    ProductionCity as ClientProductionCity,
    Project as ClientProject,
    ProjectProjectType as ClientProjectProjectType,
    ProjectType as ClientProjectType,
    UserMedia as ClientUserMedia,
    ProfileUnavailability as ClientProfileUnavailability,
    UserAvailability as ClientUserAvailability,
    UserSetting as ClientUserSetting,
    WorkProfileChoice as ClientWorkProfileChoice,
} from '@sugarcube/schema';
import type { Currency } from './currency.js';
import type { Discipline } from './discipline.js';
import type { Position } from './position.js';
import type { ProductionCity } from './productionCity.js';
import type { Project } from './project.js';
import type { ProjectProjectType } from './projectProjectType.js';
import type { ProjectType } from './projectType.js';
import type { User } from './user.js';
import type { ProfileUnavailability, UserAvailability } from './userAvailability.js';
import type { UserMedia } from './userMedia.js';
import type { UserSetting } from './userSetting.js';
import type { WorkProfileChoice } from './userWorkProfile.js';

type Expect<T extends true> = T;
type Subset<Full, Part> = Full extends Part ? true : never;
type Hidden<T, K extends string> = K extends keyof T ? never : true;

// Client schemas are written separately and must stay a subset of these entities.
// Hidden fields are the ones that must not be added to the client copy.
type _currency = Expect<Subset<Currency, ClientCurrency>>;
type _discipline = Expect<Subset<Discipline, ClientDiscipline>>;
type _position = Expect<Subset<Position, ClientPosition>>;
type _productionCity = Expect<Subset<ProductionCity, ClientProductionCity>>;
type _project = Expect<Subset<Project, ClientProject>>;
type _projectProjectType = Expect<Subset<ProjectProjectType, ClientProjectProjectType>>;
type _projectType = Expect<Subset<ProjectType, ClientProjectType>>;
type _user = Expect<Subset<User, CurrentUser>>;
type _userMedia = Expect<Subset<UserMedia, ClientUserMedia>>;
type _userAvailability = Expect<Subset<UserAvailability, ClientUserAvailability>>;
type _profileUnavailability = Expect<Subset<ProfileUnavailability, ClientProfileUnavailability>>;
type _userSetting = Expect<Subset<UserSetting, ClientUserSetting>>;
type _workProfileChoice = Expect<Subset<WorkProfileChoice, ClientWorkProfileChoice>>;

type _hideKeycloakId = Expect<Hidden<CurrentUser, 'keycloak_id'>>;
type _hideProjectOwner = Expect<Hidden<ClientProject, 'user_account_id'>>;
type _hideMediaOwner = Expect<Hidden<ClientUserMedia, 'user_account_id'>>;
type _hideAvailabilityOwner = Expect<Hidden<ClientUserAvailability, 'user_account_id'>>;
type _hideSettingOwner = Expect<Hidden<ClientUserSetting, 'user_account_id'>>;
type _hideMediaOrder = Expect<Hidden<ClientUserMedia, 'sort_order'>>;
type _hideMediaThumbnail = Expect<Hidden<ClientUserMedia, 'thumbnail'>>;
type _hideMediaStreamUrl = Expect<Hidden<ClientUserMedia, 'stream_url'>>;
type _hideLatitude = Expect<Hidden<ClientProductionCity, 'latitude'>>;
type _hideLongitude = Expect<Hidden<ClientProductionCity, 'longitude'>>;
