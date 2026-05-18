using autosalon.Data;
using autosalon.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace YourProject.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly AppDbContext _db;
        public UsersController(AppDbContext db) { _db = db; }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var users = await _db.Users
                .Select(u => new {
                    u.Id,
                    u.Name,
                    u.Login,
                    u.Password,
                    u.Phone,
                    u.Email,
                    u.Role
                }).ToListAsync();
            return Ok(users);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var user = await _db.Users.FindAsync(id);
            if (user == null) return NotFound();
            return Ok(new
            {
                user.Id,
                user.Name,
                user.Login,
                user.Password,
                user.Phone,
                user.Email,
                user.Role
            });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest req)
        {
            var user = await _db.Users
                .Where(u => u.Login == req.Login && u.Password == req.Password)
                .Select(u => new {
                    u.Id,
                    u.Name,
                    u.Login,
                    u.Password,
                    u.Phone,
                    u.Email,
                    u.Role
                })
                .FirstOrDefaultAsync();

            if (user == null)
                return Unauthorized(new { message = "Неверный логин или пароль" });

            return Ok(user);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] User user)
        {
            user.Sales = new List<Sale>();
            _db.Users.Add(user);
            await _db.SaveChangesAsync();
            return Ok(new
            {
                user.Id,
                user.Name,
                user.Login,
                user.Password,
                user.Phone,
                user.Email,
                user.Role
            });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] User updated)
        {
            var user = await _db.Users.FindAsync(id);
            if (user == null) return NotFound();

            user.Name = updated.Name;
            user.Login = updated.Login;
            user.Password = updated.Password;
            user.Phone = updated.Phone;
            user.Email = updated.Email;
            user.Role = updated.Role;

            await _db.SaveChangesAsync();
            return Ok(new
            {
                user.Id,
                user.Name,
                user.Login,
                user.Password,
                user.Phone,
                user.Email,
                user.Role
            });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var user = await _db.Users.FindAsync(id);
            if (user == null) return NotFound();
            if (user.Role == Role.Admin)
                return BadRequest(new { message = "Администратора нельзя удалить" });
            _db.Users.Remove(user);
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }

    public class LoginRequest
    {
        public string Login { get; set; }
        public string Password { get; set; }
    }
}