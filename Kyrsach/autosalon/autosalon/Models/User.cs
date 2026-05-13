using Microsoft.AspNetCore.Identity.Data;

namespace autosalon.Models
{
    public enum Role
    {
        User = 1,
        Admin = 2,
        Manager = 3,
        Accountant = 4
    }

    public class User
    {
        public int Id { get; set; }

        public string Name { get; set; }

        public string Login { get; set; }

        public string Password { get; set; }

        public string Phone { get; set; }

        public string Email { get; set; }

        public ICollection<Sale> Sales { get; set; }
    }
}
