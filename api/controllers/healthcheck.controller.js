// Logic for healthcheck
export const getHealthcheck = async (req, res) => {
    return res.status(200).json({
        status: `ok`
    })
}
