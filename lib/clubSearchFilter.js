const clubSearchFilter = (() => {
    const CLUB_TYPE = {
        LION: 'LION',
        LEO: 'LEO',
    };

    function normalizeClubType(typeClub) {
        const value = String(typeClub ?? '').trim().toUpperCase();

        if (value === CLUB_TYPE.LEO) {
            return CLUB_TYPE.LEO;
        }

        return CLUB_TYPE.LION;
    }

    function filterClubsByTypeAndQuery(clubsData, selectedType, query) {
        const normalizedQuery = query.trim().toLowerCase();
        const normalizedSelectedType = normalizeClubType(selectedType);

        return clubsData
            .filter((club) => {
                const clubName = club.nomClub?.trim();

                if (!clubName) {
                    return false;
                }

                const clubType = normalizeClubType(club.typeClub);

                if (clubType !== normalizedSelectedType) {
                    return false;
                }

                if (!normalizedQuery) {
                    return true;
                }

                return clubName.toLowerCase().includes(normalizedQuery);
            })
            .map((club) => club.nomClub.trim())
            .sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
    }

    return {
        CLUB_TYPE,
        normalizeClubType,
        filterClubsByTypeAndQuery,
    };
})();

export const { CLUB_TYPE, normalizeClubType, filterClubsByTypeAndQuery } = clubSearchFilter;
