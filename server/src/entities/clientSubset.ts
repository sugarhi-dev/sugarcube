import type {
    Currency as ClientCurrency,
    CurrentUser,
    Discipline as ClientDiscipline,
    Position as ClientPosition,
    ProductionCity as ClientProductionCity,
    Project as ClientProject,
    ProjectProjectType as ClientProjectProjectType,
    ProjectType as ClientProjectType,
} from '@sugarcube/schema';
import type { Currency } from './currency.js';
import type { Discipline } from './discipline.js';
import type { Position } from './position.js';
import type { ProductionCity } from './productionCity.js';
import type { Project } from './project.js';
import type { ProjectProjectType } from './projectProjectType.js';
import type { ProjectType } from './projectType.js';
import type { User } from './user.js';

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

type _hideKeycloakId = Expect<Hidden<CurrentUser, 'keycloak_id'>>;
type _hideProjectOwner = Expect<Hidden<ClientProject, 'user_profile_id'>>;
type _hideLatitude = Expect<Hidden<ClientProductionCity, 'latitude'>>;
type _hideLongitude = Expect<Hidden<ClientProductionCity, 'longitude'>>;
